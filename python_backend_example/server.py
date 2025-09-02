
from flask import Flask, request, jsonify, make_response, send_from_directory, redirect
from flask_cors import CORS
import subprocess
import time
import random
import os
import signal
import webbrowser
import datetime
import shutil
import zipfile
import tempfile
import xml.etree.ElementTree as ET
import pkg_resources
import re
from threading import Thread
from collections import deque
import json

app = Flask(__name__)
CORS(app)

# --- Configuration ---
# IMPORTANT: This is the path to your Robot Framework project folder.
# You MUST change this to the absolute path of your test directory.
# Example for Windows: TESTS_DIRECTORY = 'C:\\Users\\YourUser\\Documents\\robot-projects\\my-project'
# Example for macOS/Linux: TESTS_DIRECTORY = '/home/user/robot-projects/my-project'
TESTS_DIRECTORY = None  # <-- CHANGE THIS

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(SCRIPT_DIR, 'reports_archive')
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)


# --- Global State ---
class ExecutionState:
    def __init__(self):
        self.process = None
        self.status = "idle"
        self.logs = deque(maxlen=1000)
        self.pass_count = 0
        self.fail_count = 0
        self.report_file = None
        self.log_file = None
        self.video_file = None
        self.return_code = None
        self.orchestrator_data = None

    def reset(self):
        self.__init__()

state = ExecutionState()

# --- Utility Functions ---
def parse_robot_file(file_path):
    test_cases = []
    in_test_cases_section = False
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                stripped_line = line.strip()
                if stripped_line.lower().startswith('*** test cases ***'):
                    in_test_cases_section = True
                    continue
                if stripped_line.lower().startswith('***'):
                    in_test_cases_section = False
                    continue
                if in_test_cases_section and stripped_line and not stripped_line.startswith('#') and not stripped_line.startswith('[') and not line.startswith((' ', '\t')):
                    test_cases.append(stripped_line)
    except Exception as e:
        print(f"Could not parse file {file_path}: {e}")
    return test_cases

def get_installed_packages():
    return {pkg.project_name.lower(): pkg.version for pkg in pkg_resources.working_set}

def parse_requirements_file(requirements_path):
    if not os.path.exists(requirements_path):
        return {}
    
    required_packages = {}
    with open(requirements_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('-e') or line.startswith('git+'):
                continue
            
            # Remove comments
            if '#' in line:
                line = line.split('#')[0].strip()
            
            # Simple parsing for package name
            match = re.match(r'^([a-zA-Z0-9_-]+)', line)
            if match:
                package_name = match.group(1).lower()
                required_packages[package_name] = line # Store the full line for installation
    
    return required_packages

def find_requirements_files(search_directory):
    requirements_files = []
    for root, dirs, files in os.walk(search_directory):
        for file in files:
            if file.lower() in ['requirements.txt', 'requirements-dev.txt', 'requirements-test.txt']:
                requirements_files.append(os.path.join(root, file))
    return requirements_files

def scan_dependencies():
    result = {
        'status': 'success',
        'installed_packages_count': 0,
        'requirements_files': [],
        'missing_packages': [],
        'suggestions': [],
        'errors': []
    }
    
    try:
        installed_packages = get_installed_packages()
        result['installed_packages_count'] = len(installed_packages)
        
        project_root = os.path.dirname(os.path.abspath(TESTS_DIRECTORY)) if TESTS_DIRECTORY else SCRIPT_DIR
        requirements_files = find_requirements_files(project_root)
        # Also check the script's directory for good measure
        requirements_files.extend(find_requirements_files(SCRIPT_DIR))
        requirements_files = list(set(requirements_files)) # Remove duplicates
        result['requirements_files'] = requirements_files
        
        if not requirements_files:
            result['suggestions'].append("No requirements.txt files found")
            return result
        
        all_required_packages = {}
        for req_file in requirements_files:
            required_packages = parse_requirements_file(req_file)
            for pkg_name, raw_line in required_packages.items():
                if pkg_name not in all_required_packages:
                    all_required_packages[pkg_name] = {'raw_line': raw_line, 'source_file': req_file}
        
        missing_packages_list = []
        for pkg_name, pkg_info in all_required_packages.items():
            if pkg_name not in installed_packages:
                missing_packages_list.append(pkg_info)
        
        result['missing_packages'] = missing_packages_list
        if not missing_packages_list:
            result['suggestions'].append("All dependencies satisfied")
    
    except Exception as e:
        result['status'] = 'error'
        result['errors'].append(f"Error during scan: {str(e)}")
    
    return result

def install_missing_dependencies_thread(missing_packages):
    global state
    
    try:
        state.logs.append("Starting dependency installation...")
        
        for i, pkg_info in enumerate(missing_packages, 1):
            pkg_line = pkg_info['raw_line']
            state.logs.append(f"Installing [{i}/{len(missing_packages)}]: {pkg_line}")
            
            # Use subprocess to run pip install
            process = subprocess.Popen(
                ['pip', 'install', pkg_line],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            # Stream output to logs
            for line in iter(process.stdout.readline, ''):
                if line.strip():
                    state.logs.append(f"  {line.strip()}")
            
            return_code = process.wait()
            
            if return_code == 0:
                state.logs.append(f"  ✓ Successfully installed: {pkg_info['raw_line']}")
            else:
                state.logs.append(f"  ✗ Failed to install: {pkg_info['raw_line']}")
        
        state.logs.append("Dependency installation completed")
        state.status = 'success'
        
    except Exception as e:
        state.logs.append(f"Error during installation: {str(e)}")
        state.status = 'failed'
    finally:
        state.process = None


def find_video_in_dir(directory):
    """Finds the most recently modified video file in a directory."""
    video_extensions = ('.mp4', '.webm', '.avi', '.mov')
    latest_video = None
    latest_time = 0

    if not os.path.isdir(directory):
        return None

    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(video_extensions):
                file_path = os.path.join(root, file)
                mod_time = os.path.getmtime(file_path)
                if mod_time > latest_time:
                    latest_time = mod_time
                    latest_video = file_path
    return latest_video

def parse_test_statistics_from_xml(output_dir):
    """Parses pass/fail counts from Robot's output.xml."""
    output_xml_path = os.path.join(output_dir, 'output.xml')
    
    if not os.path.exists(output_xml_path):
        return 0, 0
    
    try:
        tree = ET.parse(output_xml_path)
        root = tree.getroot()
        
        # Method 1: Look for the <statistics> tag (more reliable)
        for statistics in root.findall('.//statistics'):
            for total in statistics.findall('.//total'):
                for stat in total.findall('stat'):
                    if stat.get('id') == 'All Tests':
                        pass_count = int(stat.get('pass', 0))
                        fail_count = int(stat.get('fail', 0))
                        return pass_count, fail_count
        
        # Method 2: Fallback by counting test statuses (less reliable)
        pass_count = fail_count = 0
        for test in root.findall('.//test'):
            status = test.find('status')
            if status is not None:
                if status.get('status') == 'PASS':
                    pass_count += 1
                elif status.get('status') == 'FAIL':
                    fail_count += 1
        
        return pass_count, fail_count
        
    except Exception as e:
        state.logs.append(f"Error parsing output.xml: {e}")
        return 0, 0

def create_variable_file_from_data(timestamp):
    if not state.orchestrator_data:
        return None

    headers = state.orchestrator_data.get('headers', [])
    data_rows = state.orchestrator_data.get('data', [])

    if not headers or not data_rows:
        return None

    var_file_path = os.path.join(tempfile.gettempdir(), f'orchestrator_vars_{timestamp}.py')

    with open(var_file_path, 'w', encoding='utf-8') as f:
        f.write("# Auto-generated variable file\n\n")
        
        # Create simple variables from the first row of data
        first_row = data_rows[0]
        for i, header in enumerate(headers):
            # Sanitize header to create a valid variable name
            var_name = re.sub(r'\W|^(?=\d)', '_', header)
            value = first_row[i] if i < len(first_row) else ""
            f.write(f"{var_name} = {json.dumps(value)}\n")
            
        # Create a list of dictionaries for all data rows
        f.write("\nORCHESTRATOR_DATA = [\n")
        for row in data_rows:
            row_dict = {re.sub(r'\W|^(?=\d)', '_', headers[i]): (row[i] if i < len(row) else "") for i in range(len(headers))}
            f.write(f"    {json.dumps(row_dict)},\n")
        f.write("]\n")
    
    return var_file_path


def run_robot_in_thread(command, output_dir, timestamp):
    global state
    output_dir = os.path.abspath(output_dir)

    try:
        # Use CREATE_NEW_PROCESS_GROUP on Windows and os.setsid on Unix-like
        # systems to allow for proper termination of the process tree.
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        preexec_fn = os.setsid if os.name != 'nt' else None

        state.process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            creationflags=creation_flags,
            preexec_fn=preexec_fn
        )

        for line in iter(state.process.stdout.readline, ''):
            if line.strip():
                state.logs.append(line.strip())

        state.process.stdout.close()
        state.return_code = state.process.wait()

        if state.status == "stopped":
            state.logs.append("Execution was manually stopped.")
            return

        # Parse test statistics
        if os.path.exists(output_dir):
            pass_count, fail_count = parse_test_statistics_from_xml(output_dir)
            state.pass_count = pass_count
            state.fail_count = fail_count

        # Archive reports
        try:
            if os.path.exists(output_dir):
                for f in os.listdir(output_dir):
                    temp_file_path = os.path.join(output_dir, f)
                    if f.lower() == 'report.html':
                        archived_name = f"report-{timestamp}.html"
                        shutil.move(temp_file_path, os.path.join(REPORTS_DIR, archived_name))
                        state.report_file = archived_name
                    elif f.lower() == 'log.html':
                        archived_name = f"log-{timestamp}.html"
                        shutil.move(temp_file_path, os.path.join(REPORTS_DIR, archived_name))
                        state.log_file = archived_name

            # Archive video if one was created
            project_root = os.path.dirname(os.path.abspath(TESTS_DIRECTORY))
            video_search_dir = os.path.join(project_root, 'Execution_Videos')
            
            new_video_path = find_video_in_dir(video_search_dir)
            if new_video_path:
                video_ext = os.path.splitext(new_video_path)[1]
                archived_video_name = f"video-{timestamp}{video_ext}"
                shutil.move(new_video_path, os.path.join(REPORTS_DIR, archived_video_name))
                state.video_file = archived_video_name

        except Exception as e:
            state.logs.append(f"Error archiving reports/video: {e}")

        state.status = 'success' if state.return_code == 0 else 'failed'

    except FileNotFoundError:
        state.logs.append("ERROR: 'robot' command not found. Is Robot Framework installed and in your system's PATH?")
        state.status = "failed"
    except Exception as e:
        state.logs.append(f"An unexpected error occurred in the execution thread: {e}")
        # Ensure status is not left as "running" on unexpected errors
        if state.status == "running":
            state.status = "failed"
    finally:
        state.process = None
        # Clean up the temporary output directory
        if os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir)
            except Exception as e:
                print(f"Error cleaning up temp output directory: {e}")

def find_matching_report_file(requested_filename, reports_dir):
    """Finds the actual report file, handling dynamic timestamps."""
    # Clean fragment identifiers and query params
    clean_requested = requested_filename.split('#')[0].split('?')[0]
    
    # Direct match
    if os.path.exists(os.path.join(reports_dir, clean_requested)):
        return clean_requested
    
    # If a generic 'log.html' or 'report.html' is requested, find the latest one
    if clean_requested.lower() in ['log.html', 'report.html']:
        file_type = 'log' if clean_requested.lower() == 'log.html' else 'report'
        
        try:
            # Find all files of that type, e.g., 'log-20230101-120000.html'
            matching_files = []
            for f in os.listdir(reports_dir):
                if f.lower().startswith(f'{file_type}-') and f.lower().endswith('.html'):
                    matching_files.append((f, os.path.getmtime(os.path.join(reports_dir, f))))
            
            if matching_files:
                # Sort by modification time, newest first
                matching_files.sort(key=lambda x: x[1], reverse=True)
                return matching_files[0][0]
        except Exception as e:
            print(f"Error finding matching report file: {e}")
    
    return None

# --- API Endpoints ---
@app.route('/list-suites', methods=['GET'])
def list_suites():
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        return jsonify({"error": "Test directory is not configured in server.py"}), 500

    suites = []
    try:
        for root, _, files in os.walk(TESTS_DIRECTORY):
            for file in files:
                if file.endswith('.robot'):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, TESTS_DIRECTORY)
                    test_cases = parse_robot_file(file_path)
                    if test_cases: # Only add files that contain test cases
                        suites.append({
                            "name": relative_path.replace('\\', '/'),
                            "testCases": test_cases
                        })
        suites.sort(key=lambda x: x['name'])
        return jsonify(suites)
    except Exception as e:
        return jsonify({"error": f"Failed to scan suites: {str(e)}"}), 500

@app.route('/scan-dependencies', methods=['GET'])
def scan_dependencies_endpoint():
    result = scan_dependencies()
    return jsonify(result)


@app.route('/install-dependencies', methods=['POST'])
def install_dependencies():
    global state
    if state.status == "running":
        return jsonify({"status": "error", "message": "Operation in progress"}), 409
    
    try:
        data = request.get_json()
        missing_packages = data.get('missing_packages', [])
        if not missing_packages:
            return jsonify({"status": "error", "message": "No packages to install"}), 400
        
        state.reset()
        state.status = "running"
        thread = Thread(target=install_missing_dependencies_thread, args=(missing_packages,))
        thread.daemon = True
        thread.start()
        return jsonify({"status": "running", "message": f"Installing {len(missing_packages)} packages..."})
    except Exception as e:
        state.reset()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/run', methods=['POST'])
def run_robot_tests():
    global state
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        return jsonify({"status": "error", "message": "Test directory is not configured in server.py"}), 400

    if state.status == "running":
        return jsonify({"status": "error", "message": "Execution already running"}), 409

    try:
        data = request.get_json()
        state.reset()
        state.status = "running"
        runType = data.get('runType')
        config = data.get('config', {})
        
        if runType == 'Orchestrator' and 'orchestratorData' in config:
            state.orchestrator_data = config['orchestratorData']
            # Sort by priority if available
            headers = state.orchestrator_data.get('headers', [])
            data_rows = state.orchestrator_data.get('data', [])
            try:
                priority_index = next((i for i, h in enumerate(headers) if str(h).lower() == 'priority'), -1)
                if priority_index != -1:
                    priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
                    # Keep original index to maintain stability for same-priority items
                    indexed_rows = list(enumerate(data_rows))
                    indexed_rows.sort(key=lambda x: (priority_order.get(str(x[1][priority_index]).upper(), 99), x[0]))
                    state.orchestrator_data['data'] = [row for _, row in indexed_rows]
            except Exception as e:
                state.logs.append(f"Could not sort by priority: {e}")

        tests_to_run_path = TESTS_DIRECTORY
        command = ['robot']
        timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        output_dir = os.path.abspath(os.path.join(tempfile.gettempdir(), f'temp_output_{timestamp}'))
        command.extend(['--outputdir', output_dir])
        
        variable_file_to_cleanup = None

        if runType == 'By Tag':
            if config.get('includeTags'): command.extend(['-i', config['includeTags']])
            if config.get('excludeTags'): command.extend(['-e', config['excludeTags']])
        elif runType == 'By Suite' and config.get('suite'):
            suite_path = os.path.join(TESTS_DIRECTORY, config['suite'].replace('/', os.sep))
            if os.path.isfile(suite_path):
                tests_to_run_path = suite_path
            else:
                return jsonify({"status": "error", "message": f"Suite not found: {suite_path}"}), 404
        elif runType == 'By Test Case' and config.get('testcase'):
            command.extend(['-t', config['testcase']])
        elif runType == 'Orchestrator':
            variable_file_to_cleanup = create_variable_file_from_data(timestamp)
            if variable_file_to_cleanup:
                command.extend(['--variablefile', variable_file_to_cleanup])

        command.append(tests_to_run_path)

        thread = Thread(target=run_robot_in_thread, args=(command, output_dir, timestamp))
        thread.daemon = True
        thread.start()
        
        # Clean up the variable file after a short delay to ensure robot has read it
        if variable_file_to_cleanup:
            try:
                time.sleep(2) # Give robot time to read the file
                os.remove(variable_file_to_cleanup)
            except Exception as e:
                print(f"Error cleaning up var file: {e}")

        return jsonify({"status": "running", "message": "Execution started"})
    except Exception as e:
        state.reset()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        "status": state.status,
        "logs": list(state.logs),
        "pass_count": state.pass_count,
        "fail_count": state.fail_count,
        "reportFile": state.report_file,
        "logFile": state.log_file,
        "videoFile": state.video_file
    })

@app.route('/stop', methods=['POST'])
def stop_robot_tests():
    if state.process and state.process.poll() is None:
        try:
            state.status = "stopped"
            # Terminate the entire process group
            if os.name == 'nt':
                # On Windows, sending CTRL_BREAK_EVENT is more effective for console apps
                state.process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                # On Unix-like systems, kill the process group
                os.killpg(os.getpgid(state.process.pid), signal.SIGTERM)
            return jsonify({"status": "success", "message": "Stop signal sent"})
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
    return jsonify({"status": "info", "message": "No execution running"})

@app.route('/reports', methods=['GET'])
def list_reports():
    try:
        files = os.listdir(REPORTS_DIR)
        files.sort(key=lambda x: os.path.getmtime(os.path.join(REPORTS_DIR, x)), reverse=True)
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download-report/<filename>', methods=['GET'])
def download_report(filename):
    try:
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        if not actual_filename:
            return jsonify({"error": "File not found"}), 404
        return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reports/<filename>', methods=['GET'])
def get_report(filename):
    try:
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        if not actual_filename:
            return jsonify({"error": "File not found"}), 404
        
        # For HTML files, inject JS to fix relative links if needed
        if actual_filename.endswith('.html'):
            with open(os.path.join(REPORTS_DIR, actual_filename), 'r', encoding='utf-8') as f:
                html_content = f.read()
            # Simple link fixing for demo purposes
            if 'report-' in actual_filename:
                timestamp = actual_filename.split('-')[1].split('.')[0]
                html_content = html_content.replace('log.html', f'log-{timestamp}.html')
            response = make_response(html_content)
            response.headers['Content-Type'] = 'text/html'
            return response
        elif actual_filename.lower().endswith(('.mp4', '.webm')):
            # Redirect to a streaming endpoint for videos
            return redirect(f'/stream-video/{actual_filename}')
        else:
            # For other files, serve them directly
            return send_from_directory(REPORTS_DIR, actual_filename)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/stream-video/<filename>', methods=['GET'])
def stream_video(filename):
    try:
        file_path = os.path.join(REPORTS_DIR, filename)
        range_header = request.headers.get('Range', None)
        file_size = os.path.getsize(file_path)
        
        if range_header:
            byte1, byte2 = 0, None
            m = re.search('(\d+)-(\d*)', range_header)
            g = m.groups()
            if g[0]: byte1 = int(g[0])
            if g[1]: byte2 = int(g[1])

            length = file_size - byte1
            if byte2 is not None:
                length = byte2 - byte1 + 1
            
            data = None
            with open(file_path, 'rb') as f:
                f.seek(byte1)
                data = f.read(length)
            
            rv = make_response(data)
            rv.status_code = 206
            rv.headers.add('Content-Range', f'bytes {byte1}-{byte1 + length - 1}/{file_size}')
            mimetype = 'video/mp4' if filename.endswith('.mp4') else 'video/webm'
            rv.headers.add('Content-type', mimetype)
            return rv
        else:
            return send_from_directory(REPORTS_DIR, filename)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete-report/<filename>', methods=['DELETE'])
def delete_report(filename):
    try:
        file_path = os.path.join(REPORTS_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"success": f"Deleted {filename}"})
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("Robot Maestro Backend Server")
    if TESTS_DIRECTORY:
        print(f"✓ Active Test Directory: {TESTS_DIRECTORY}")
    else:
        print("✗ WARNING: No active test directory.")
        print("  Please edit server.py and set the TESTS_DIRECTORY variable.")
    print(f"✓ Reports will be archived in: {REPORTS_DIR}")
    print("=" * 60)
    print("Starting server on http://127.0.0.1:5001")
    app.run(host='127.0.0.1', port=5001, debug=True)

    
    

    