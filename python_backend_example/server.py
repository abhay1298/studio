
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
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(filename='robot_maestro.log', level=logging.INFO, 
                   format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(SCRIPT_DIR, 'projects')
REPORTS_DIR = os.path.join(SCRIPT_DIR, 'reports_archive')
CONFIG_FILE = os.path.join(SCRIPT_DIR, 'robot_maestro_config.json')
TESTS_DIRECTORY = None # This will be set dynamically

# --- Setup Directories ---
os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)


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

def load_config():
    """Loads the active test directory from the config file."""
    global TESTS_DIRECTORY
    if not os.path.exists(CONFIG_FILE):
        logging.info("Config file not found. No test directory loaded at startup.")
        TESTS_DIRECTORY = None
        return

    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
        
        test_dir = config.get('test_directory')
        if test_dir and os.path.isdir(test_dir):
            TESTS_DIRECTORY = test_dir
            logging.info(f"Loaded test directory from config: {TESTS_DIRECTORY}")
        else:
            logging.warning(f"Configured test directory not found: {test_dir}")
            TESTS_DIRECTORY = None
    except (json.JSONDecodeError, KeyError) as e:
        logging.error(f"Error loading config file: {e}")
        TESTS_DIRECTORY = None

def save_config():
    """Saves the current test directory to the config file."""
    config = {'test_directory': TESTS_DIRECTORY}
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        logging.info(f"Saved test directory to config: {TESTS_DIRECTORY}")
    except Exception as e:
        logging.error(f"Could not save config file: {e}")

def find_test_directory_in_project(project_path):
    """Finds the most likely test directory within a given project path."""
    common_test_dirs = ['tests', 'test', 'robot', 'robot_tests', 'automation', 'suites', 'qa']
    
    # First, look for common directory names
    for dir_name in common_test_dirs:
        potential_path = os.path.join(project_path, dir_name)
        if os.path.isdir(potential_path) and any(f.endswith('.robot') for f in os.listdir(potential_path)):
            logging.info(f"Found test directory by common name: {potential_path}")
            return potential_path

    # If not found, do a broader search for any directory containing .robot files
    for root, _, files in os.walk(project_path):
        if any(f.endswith('.robot') for f in files):
            logging.info(f"Found test directory by file search: {root}")
            return root
            
    logging.warning(f"Could not find a test directory in {project_path}")
    return project_path # Fallback to the project root

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
        logging.debug(f"Parsed {len(test_cases)} test cases from {file_path}")
    except Exception as e:
        logging.error(f"Could not parse file {file_path}: {e}")
    return test_cases

def get_installed_packages():
    try:
        packages = {pkg.project_name.lower(): pkg.version for pkg in pkg_resources.working_set}
        logging.debug(f"Found {len(packages)} installed packages")
        return packages
    except Exception as e:
        logging.error(f"Error getting installed packages: {e}")
        return {}

def parse_requirements_file(requirements_path):
    if not os.path.exists(requirements_path):
        logging.warning(f"Requirements file not found: {requirements_path}")
        return {}
    
    required_packages = {}
    try:
        with open(requirements_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or line.startswith('-e') or line.startswith('git+'):
                    continue
                
                if '#' in line:
                    line = line.split('#')[0].strip()
                
                match = re.match(r'^([a-zA-Z0-9_-]+)([><=!~]+.*)?$', line)
                if match:
                    package_name = match.group(1).lower()
                    version_spec = match.group(2) if match.group(2) else None
                    required_packages[package_name] = {
                        'name': package_name,
                        'version_spec': version_spec,
                        'raw_line': line
                    }
        logging.debug(f"Parsed {len(required_packages)} packages from {requirements_path}")
    except Exception as e:
        logging.error(f"Error parsing requirements file {requirements_path}: {e}")
    
    return required_packages

def find_requirements_files(search_directory):
    requirements_files = []
    if not search_directory or not os.path.isdir(search_directory):
        return []
    for root, dirs, files in os.walk(search_directory):
        for file in files:
            if file.lower() in ['requirements.txt', 'requirements-dev.txt', 'requirements-test.txt']:
                requirements_files.append(os.path.join(root, file))
    logging.debug(f"Found {len(requirements_files)} requirements files in {search_directory}")
    return requirements_files

def check_version_compatibility(installed_version, version_spec):
    if not version_spec:
        return True
    
    try:
        from packaging import version, specifiers
        spec = specifiers.SpecifierSet(version_spec)
        return version.parse(installed_version) in spec
    except ImportError:
        if version_spec.startswith('=='):
            return installed_version == version_spec[2:]
        return True
    except Exception as e:
        logging.error(f"Error checking version compatibility: {e}")
        return True

def find_video_in_dir(directory):
    video_extensions = ('.mp4', '.webm', '.avi', '.mov')
    latest_video = None
    latest_time = 0

    if not os.path.isdir(directory):
        logging.warning(f"Video directory not found: {directory}")
        return None

    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(video_extensions):
                file_path = os.path.join(root, file)
                mod_time = os.path.getmtime(file_path)
                if mod_time > latest_time:
                    latest_time = mod_time
                    latest_video = file_path
    if latest_video:
        logging.debug(f"Found video file: {latest_video}")
    return latest_video

def parse_test_statistics_from_xml(output_dir):
    output_xml_path = os.path.join(output_dir, 'output.xml')
    
    if not os.path.exists(output_xml_path):
        logging.warning(f"output.xml not found in {output_dir}")
        return 0, 0
    
    try:
        tree = ET.parse(output_xml_path)
        root = tree.getroot()
        
        for statistics in root.findall('.//statistics'):
            for total in statistics.findall('.//total'):
                for stat in total.findall('stat'):
                    if stat.get('id') == 'All Tests':
                        pass_count = int(stat.get('pass', 0))
                        fail_count = int(stat.get('fail', 0))
                        logging.debug(f"Parsed stats from XML: {pass_count} passed, {fail_count} failed")
                        return pass_count, fail_count
        
        pass_count = fail_count = 0
        for test in root.findall('.//test'):
            status = test.find('status')
            if status is not None:
                if status.get('status') == 'PASS':
                    pass_count += 1
                elif status.get('status') == 'FAIL':
                    fail_count += 1
        
        logging.debug(f"Parsed stats from XML (test loop): {pass_count} passed, {fail_count} failed")
        return pass_count, fail_count
        
    except Exception as e:
        state.logs.append(f"Error parsing output.xml: {e}")
        logging.error(f"Error parsing output.xml: {e}")
        return 0, 0

def create_variable_file_from_data(timestamp):
    if not state.orchestrator_data:
        logging.debug("No orchestrator data provided")
        return None

    headers = state.orchestrator_data.get('headers', [])
    data_rows = state.orchestrator_data.get('data', [])

    if not headers or not data_rows:
        logging.warning("Invalid orchestrator data: empty headers or data rows")
        return None

    var_file_path = os.path.join(tempfile.gettempdir(), f'orchestrator_vars_{timestamp}.py')

    with open(var_file_path, 'w', encoding='utf-8') as f:
        f.write("# Auto-generated variable file\n\n")
        
        first_row = data_rows[0]
        for i, header in enumerate(headers):
            var_name = re.sub(r'\W|^(?=\d)', '_', header)
            value = first_row[i] if i < len(first_row) else ""
            f.write(f"{var_name} = {json.dumps(value)}\n")
            
        f.write("\nORCHESTRATOR_DATA = [\n")
        for row in data_rows:
            row_dict = {re.sub(r'\W|^(?=\d)', '_', headers[i]): (row[i] if i < len(row) else "") for i in range(len(headers))}
            f.write(f"    {json.dumps(row_dict)},\n")
        f.write("]\n")
    
    logging.debug(f"Created variable file: {var_file_path}")
    return var_file_path

def run_robot_in_thread(command, output_dir, timestamp, project_dir):
    global state
    output_dir = os.path.abspath(output_dir)

    try:
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
            preexec_fn=preexec_fn,
            cwd=project_dir  # Run the command from the project directory
        )

        for line in iter(state.process.stdout.readline, ''):
            if line.strip():
                state.logs.append(line.strip())
                logging.debug(f"Robot output: {line.strip()}")

        state.process.stdout.close()
        state.return_code = state.process.wait()

        if state.status == "stopped":
            state.logs.append("Execution was manually stopped.")
            logging.info("Execution was manually stopped")
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
                        logging.debug(f"Archived report: {archived_name}")
                    elif f.lower() == 'log.html':
                        archived_name = f"log-{timestamp}.html"
                        shutil.move(temp_file_path, os.path.join(REPORTS_DIR, archived_name))
                        state.log_file = archived_name
                        logging.debug(f"Archived log: {archived_name}")

            # Archive video
            video_search_dir = os.path.join(project_dir, 'Execution_Videos')
            
            new_video_path = find_video_in_dir(video_search_dir)
            if new_video_path:
                video_ext = os.path.splitext(new_video_path)[1]
                archived_video_name = f"video-{timestamp}{video_ext}"
                shutil.move(new_video_path, os.path.join(REPORTS_DIR, archived_video_name))
                state.video_file = archived_video_name
                logging.debug(f"Archived video: {archived_video_name}")

        except Exception as e:
            state.logs.append(f"Error archiving: {e}")
            logging.error(f"Error archiving: {e}")

        state.status = 'success' if state.return_code == 0 else 'failed'
        logging.info(f"Execution completed with status: {state.status}")

    except FileNotFoundError:
        state.logs.append("ERROR: 'robot' command not found. Install Robot Framework.")
        logging.error("ERROR: 'robot' command not found")
        state.status = "failed"
    except Exception as e:
        state.logs.append(f"Error in execution: {e}")
        logging.error(f"Error in execution: {e}")
        if state.status == "running":
            state.status = "failed"
    finally:
        state.process = None
        if os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir)
                logging.debug(f"Cleaned up temporary output directory: {output_dir}")
            except Exception as e:
                logging.error(f"Error cleaning up output directory: {e}")

def find_matching_report_file(requested_filename, reports_dir):
    clean_requested = requested_filename.split('#')[0].split('?')[0]
    
    if os.path.exists(os.path.join(reports_dir, clean_requested)):
        logging.debug(f"Found report file: {clean_requested}")
        return clean_requested
    
    if clean_requested.lower() in ['log.html', 'report.html']:
        file_type = 'log' if clean_requested.lower() == 'log.html' else 'report'
        
        try:
            matching_files = []
            for f in os.listdir(reports_dir):
                if f.lower().startswith(f'{file_type}-') and f.lower().endswith('.html'):
                    matching_files.append((f, os.path.getmtime(os.path.join(reports_dir, f))))
            
            if matching_files:
                matching_files.sort(key=lambda x: x[1], reverse=True)
                logging.debug(f"Found matching report file: {matching_files[0][0]}")
                return matching_files[0][0]
        except Exception as e:
            logging.error(f"Error finding matching report file: {e}")
    
    return None

# --- API Endpoints ---

@app.route('/upload-project', methods=['POST'])
def upload_project():
    global TESTS_DIRECTORY
    if 'files' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    files = request.files.getlist('files')
    relative_paths = request.form.getlist('relativePaths')

    if not files or not relative_paths or len(files) != len(relative_paths):
        return jsonify({'error': 'Mismatch between files and paths or missing data'}), 400

    try:
        # Clean up any old project
        if os.path.exists(PROJECTS_DIR):
            shutil.rmtree(PROJECTS_DIR)
        os.makedirs(PROJECTS_DIR)
        
        project_root_name = relative_paths[0].split('/')[0] if relative_paths else 'project'
        project_root_path = os.path.join(PROJECTS_DIR, project_root_name)

        for i, file in enumerate(files):
            relative_path = relative_paths[i]
            # Sanitize the path to prevent directory traversal
            sanitized_relative_path = os.path.normpath(relative_path).lstrip('./\\')
            if '..' in sanitized_relative_path.split(os.path.sep):
                logging.warning(f"Skipping potentially malicious path: {relative_path}")
                continue
            
            # Reconstruct the full destination path
            dest_path = os.path.join(PROJECTS_DIR, sanitized_relative_path)
            
            # Create subdirectories if they don't exist
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            file.save(dest_path)

        logging.info(f"Successfully uploaded and reconstructed project at {project_root_path}")

        # Automatically find and set the test directory within the new project
        TESTS_DIRECTORY = find_test_directory_in_project(project_root_path)
        save_config()
        
        return jsonify({'status': 'success', 'message': f'Project uploaded and test directory set to {TESTS_DIRECTORY}'})

    except Exception as e:
        logging.error(f"Error uploading project: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/list-suites', methods=['GET'])
def list_suites():
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        logging.warning("No test directory configured for /list-suites")
        return jsonify({"error": "No test directory configured. Please upload a project."}), 500

    suites = []
    try:
        for root, _, files in os.walk(TESTS_DIRECTORY):
            for file in files:
                if file.endswith('.robot'):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, TESTS_DIRECTORY)
                    test_cases = parse_robot_file(file_path)
                    if test_cases:
                        suites.append({
                            "name": relative_path.replace('\\', '/'),
                            "testCases": test_cases
                        })
        suites.sort(key=lambda x: x['name'])
        logging.debug(f"Found {len(suites)} test suites")
        return jsonify(suites)
    except Exception as e:
        logging.error(f"Failed to scan suites: {str(e)}")
        return jsonify({"error": f"Failed to scan suites: {str(e)}"}), 500

@app.route('/scan-dependencies', methods=['GET'])
def scan_dependencies_endpoint():
    result = {
        'status': 'success',
        'installed_packages_count': 0,
        'requirements_files': [],
        'missing_packages': [],
        'version_conflicts': [],
        'suggestions': [],
        'errors': []
    }
    
    try:
        installed_packages = get_installed_packages()
        result['installed_packages_count'] = len(installed_packages)
        
        project_root = os.path.dirname(os.path.abspath(TESTS_DIRECTORY)) if TESTS_DIRECTORY else None
        requirements_files = find_requirements_files(project_root)
        requirements_files = list(set(requirements_files))
        result['requirements_files'] = requirements_files
        
        if not requirements_files:
            result['suggestions'].append("No requirements.txt files found")
            return jsonify(result)
        
        all_required_packages = {}
        for req_file in requirements_files:
            required = parse_requirements_file(req_file)
            for pkg_name, pkg_info in required.items():
                if pkg_name not in all_required_packages:
                    all_required_packages[pkg_name] = pkg_info
        
        for pkg_name, pkg_info in all_required_packages.items():
            if pkg_name not in installed_packages:
                result['missing_packages'].append(pkg_info)
            else:
                installed_version = installed_packages[pkg_name]
                if pkg_info['version_spec'] and not check_version_compatibility(installed_version, pkg_info['version_spec']):
                    result['version_conflicts'].append({**pkg_info, 'installed_version': installed_version})
        
        if not result['missing_packages'] and not result['version_conflicts']:
            result['suggestions'].append("All dependencies satisfied")
    
    except Exception as e:
        result['status'] = 'error'
        result['errors'].append(f"Error during scan: {str(e)}")
    
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
        return jsonify({"status": "error", "message": "No test directory configured"}), 400

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
            headers = state.orchestrator_data.get('headers', [])
            data_rows = state.orchestrator_data.get('data', [])
            
            try:
                priority_index = next((i for i, h in enumerate(headers) if str(h).lower() == 'priority'), -1)
                if priority_index != -1:
                    priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
                    indexed_rows = list(enumerate(data_rows))
                    indexed_rows.sort(key=lambda x: (priority_order.get(str(x[1][priority_index]).upper(), 99), x[0]))
                    state.orchestrator_data['data'] = [row for _, row in indexed_rows]
                    logging.debug("Sorted orchestrator data by priority")
            except Exception as e:
                logging.error(f"Priority sorting error: {e}")

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

        logging.info(f"Executing robot command: {' '.join(command)}")
        thread = Thread(target=run_robot_in_thread, args=(command, output_dir, timestamp, TESTS_DIRECTORY))
        thread.daemon = True
        thread.start()
        
        if variable_file_to_cleanup:
            try:
                time.sleep(2)
                os.remove(variable_file_to_cleanup)
            except Exception as e:
                logging.error(f"Error cleaning up variable file: {e}")

        return jsonify({"status": "running", "message": "Execution started"})
    except Exception as e:
        state.reset()
        logging.error(f"Error in run_robot_tests: {str(e)}")
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
            if os.name == 'nt':
                state.process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
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
            return redirect(f'/stream-video/{actual_filename}')
        else:
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

@app.route('/test-directory-status', methods=['GET'])
def get_test_directory_status():
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        return jsonify({'configured': False, 'message': 'No test directory configured.'})
    
    try:
        robot_count = sum(len([f for f in files if f.endswith('.robot')]) 
                         for _, _, files in os.walk(TESTS_DIRECTORY))
        return jsonify({'configured': True, 'directory': TESTS_DIRECTORY, 'robot_file_count': robot_count})
    except Exception as e:
        return jsonify({'configured': False, 'message': str(e)})

@app.route('/discover-test-directories', methods=['GET'])
def discover_test_directories():
    try:
        search_path = request.args.get('start_path', PROJECTS_DIR)
        robot_dirs = []
        for root, _, files in os.walk(search_path):
            if any(f.endswith('.robot') for f in files):
                 robot_dirs.append({
                    'path': str(Path(root).absolute()),
                    'relative_path': str(Path(root).relative_to(Path(PROJECTS_DIR).absolute())),
                    'robot_count': len([f for f in files if f.endswith('.robot')])
                })
        return jsonify({'status': 'success', 'directories': robot_dirs})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/set-test-directory', methods=['POST'])
def set_test_directory():
    global TESTS_DIRECTORY
    data = request.get_json()
    new_dir = data.get('directory')
    if new_dir and os.path.isdir(new_dir):
        TESTS_DIRECTORY = new_dir
        save_config()
        return jsonify({'status': 'success', 'message': f'Test directory set to {new_dir}'})
    return jsonify({'status': 'error', 'message': 'Invalid directory'}), 400


if __name__ == '__main__':
    load_config()
    print("=" * 60)
    print("Robot Maestro Backend Server")
    if TESTS_DIRECTORY:
        print(f"✓ Active Test Directory: {TESTS_DIRECTORY}")
    else:
        print("✗ WARNING: No active test directory. Please upload a project.")
    print(f"✓ Projects will be uploaded to: {PROJECTS_DIR}")
    print(f"✓ Reports will be archived in: {REPORTS_DIR}")
    print("=" * 60)
    print("Starting server on http://127.0.0.1:5001")
    logging.info("Starting Flask server on http://127.0.0.1:5001")
    app.run(host='127.0.0.1', port=5001, debug=True)
