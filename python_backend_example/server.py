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
CORS(app) # Enable CORS for all routes

# --- Configuration ---
# Get the absolute path of the directory where this script is located.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# The TESTS_DIRECTORY will now be set dynamically when a project is uploaded.
TESTS_DIRECTORY = None

# Base directory to store uploaded and unzipped projects
PROJECTS_BASE_DIR = os.path.join(SCRIPT_DIR, 'user_projects')
if not os.path.exists(PROJECTS_BASE_DIR):
    os.makedirs(PROJECTS_BASE_DIR)


# Use an absolute path for the reports directory to ensure it's always found.
REPORTS_DIR = os.path.join(SCRIPT_DIR, 'reports_archive')
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)


# --- Global State ---
class ExecutionState:
    """Encapsulates the state of a single test execution."""
    def __init__(self):
        self.process = None
        self.status = "idle"  # idle, running, success, failed, stopped
        self.logs = deque(maxlen=1000) # Store up to 1000 log lines
        self.pass_count = 0
        self.fail_count = 0
        self.report_file = None
        self.log_file = None
        self.video_file = None
        self.return_code = None
        self.orchestrator_data = None # To hold data from the UI

    def reset(self):
        """Resets the state to its initial values for a new run."""
        self.__init__()

state = ExecutionState()

def find_and_set_tests_directory(base_path):
    """Scans the base_path for .robot files and sets the TESTS_DIRECTORY."""
    global TESTS_DIRECTORY
    
    robot_files = []
    for root, _, files in os.walk(base_path):
        for file in files:
            if file.endswith('.robot'):
                robot_files.append(os.path.join(root, file))
    
    if not robot_files:
        TESTS_DIRECTORY = base_path # Default to base if no .robot files found
        print(f"Warning: No .robot files found in {base_path}. Defaulting TESTS_DIRECTORY to project root.")
        return base_path

    # Find the longest common path among all found .robot files
    common_path = os.path.dirname(os.path.commonpath(robot_files))
    
    # Heuristic: If the common path is the same as the base path, and there's a 'tests' or 'suites' subdir, use that.
    if common_path == base_path:
        for subdir in ['tests', 'suites', 'test', 'suite']:
            potential_dir = os.path.join(base_path, subdir)
            if os.path.isdir(potential_dir):
                # Check if this subdir contains any of the robot files
                if any(rf.startswith(potential_dir) for rf in robot_files):
                    common_path = potential_dir
                    break
    
    TESTS_DIRECTORY = common_path
    print(f"** Automatically set TESTS_DIRECTORY to: {TESTS_DIRECTORY} **")
    return TESTS_DIRECTORY


@app.route('/upload-project', methods=['POST'])
def upload_project():
    """Handles the upload and extraction of a zipped project folder."""
    if 'project' not in request.files:
        return jsonify({"error": "No project file part"}), 400
    
    file = request.files['project']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and file.filename.endswith('.zip'):
        try:
            # Clear out old projects before uploading a new one
            if os.path.exists(PROJECTS_BASE_DIR):
                shutil.rmtree(PROJECTS_BASE_DIR)
            os.makedirs(PROJECTS_BASE_DIR)
            
            # Save the zip file temporarily
            zip_path = os.path.join(PROJECTS_BASE_DIR, file.filename)
            file.save(zip_path)
            
            # Unzip the file
            unzip_dir = os.path.join(PROJECTS_BASE_DIR, 'current_project')
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(unzip_dir)
            
            # Clean up the zip file
            os.remove(zip_path)

            # Find the actual project folder inside 'current_project'
            # (often zips contain a single root folder)
            extracted_items = os.listdir(unzip_dir)
            project_root = unzip_dir
            if len(extracted_items) == 1 and os.path.isdir(os.path.join(unzip_dir, extracted_items[0])):
                project_root = os.path.join(unzip_dir, extracted_items[0])

            # Automatically find and set the tests directory
            find_and_set_tests_directory(project_root)
            
            return jsonify({"message": f"Project '{os.path.basename(project_root)}' uploaded successfully. Test directory set.", "path": project_root}), 200

        except Exception as e:
            return jsonify({"error": f"Failed to process project: {str(e)}"}), 500
    else:
        return jsonify({"error": "Invalid file type. Please upload a .zip file."}), 400


def parse_robot_file(file_path):
    """Parses a .robot file to extract test case names."""
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

                # A test case starts a line, is not a setting [Tags], and is not a comment.
                if in_test_cases_section and stripped_line and not stripped_line.startswith('#') and not stripped_line.startswith('[') and not line.startswith((' ', '\t')):
                    test_cases.append(stripped_line)
    except Exception as e:
        print(f"Could not parse file {file_path}: {e}")
    return test_cases


def get_installed_packages():
    """Get a dictionary of currently installed packages and their versions."""
    try:
        installed_packages = {}
        for package in pkg_resources.working_set:
            installed_packages[package.project_name.lower()] = package.version
        return installed_packages
    except Exception as e:
        print(f"Error getting installed packages: {e}")
        return {}


def parse_requirements_file(requirements_path):
    """Parse requirements.txt file and return a dictionary of required packages."""
    if not os.path.exists(requirements_path):
        return {}
    
    required_packages = {}
    try:
        with open(requirements_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if line.startswith('-e') or line.startswith('git+'):
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
    except Exception as e:
        print(f"Error parsing requirements file: {e}")
    
    return required_packages


def find_requirements_files(search_directory):
    """Find all requirements.txt files in the repository."""
    requirements_files = []
    if not search_directory or not os.path.isdir(search_directory):
        return []
    for root, dirs, files in os.walk(search_directory):
        for file in files:
            if file.lower() in ['requirements.txt', 'requirements-dev.txt', 'requirements-test.txt']:
                requirements_files.append(os.path.join(root, file))
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
        print(f"Error checking version compatibility: {e}")
        return True


def scan_dependencies():
    """Scan for missing dependencies and return analysis."""
    global TESTS_DIRECTORY
    result = {
        'status': 'success',
        'installed_packages_count': 0,
        'requirements_files': [],
        'missing_packages': [],
        'version_conflicts': [],
        'suggestions': [],
        'errors': []
    }
    
    if not TESTS_DIRECTORY:
        result['status'] = 'error'
        result['errors'].append("No project uploaded. Please upload a project before scanning for dependencies.")
        return result

    try:
        installed_packages = get_installed_packages()
        result['installed_packages_count'] = len(installed_packages)
        
        project_root = os.path.dirname(os.path.abspath(TESTS_DIRECTORY))
        requirements_files = find_requirements_files(project_root)
        result['requirements_files'] = requirements_files
        
        if not requirements_files:
            result['suggestions'].append("No requirements.txt files found in the uploaded project.")
            return result
        
        all_required_packages = {}
        for req_file in requirements_files:
            required_packages = parse_requirements_file(req_file)
            for pkg_name, pkg_info in required_packages.items():
                if pkg_name not in all_required_packages:
                    all_required_packages[pkg_name] = pkg_info
                    all_required_packages[pkg_name]['source_file'] = req_file
        
        for pkg_name, pkg_info in all_required_packages.items():
            if pkg_name not in installed_packages:
                result['missing_packages'].append({
                    'name': pkg_name,
                    'required_spec': pkg_info['version_spec'],
                    'source_file': os.path.basename(pkg_info['source_file']),
                    'raw_line': pkg_info['raw_line']
                })
            else:
                installed_version = installed_packages[pkg_name]
                if pkg_info['version_spec'] and not check_version_compatibility(installed_version, pkg_info['version_spec']):
                    result['version_conflicts'].append({
                        'name': pkg_name,
                        'installed_version': installed_version,
                        'required_spec': pkg_info['version_spec'],
                        'source_file': os.path.basename(pkg_info['source_file']),
                        'raw_line': pkg_info['raw_line']
                    })
        
        if result['missing_packages']:
            result['suggestions'].append(f"Found {len(result['missing_packages'])} missing packages")
        if result['version_conflicts']:
            result['suggestions'].append(f"Found {len(result['version_conflicts'])} version conflicts")
        if not result['missing_packages'] and not result['version_conflicts']:
            result['suggestions'].append("All dependencies appear to be satisfied!")
    
    except Exception as e:
        result['status'] = 'error'
        result['errors'].append(f"Error during dependency scan: {str(e)}")
    
    return result


def install_missing_dependencies_thread(missing_packages):
    global state
    try:
        state.logs.append("="*80)
        state.logs.append("DEPENDENCY INSTALLATION STARTED")
        state.logs.append("="*80)
        
        for i, pkg_info in enumerate(missing_packages, 1):
            pkg_line = pkg_info['raw_line']
            state.logs.append(f"\n[{i}/{len(missing_packages)}] Installing: {pkg_line}")
            cmd = ['pip', 'install', pkg_line]
            try:
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
                for line in iter(process.stdout.readline, ''):
                    clean_line = line.strip()
                    if clean_line:
                        state.logs.append(f"  {clean_line}")
                return_code = process.wait()
                if return_code == 0:
                    state.logs.append(f"  Successfully installed: {pkg_info['name']}")
                else:
                    state.logs.append(f"  Failed to install: {pkg_info['name']} (Exit code: {return_code})")
            except Exception as e:
                state.logs.append(f"  Error installing {pkg_info['name']}: {str(e)}")
        
        state.logs.append("\n" + "="*80)
        state.logs.append("DEPENDENCY INSTALLATION COMPLETED")
        state.logs.append("="*80)
        state.logs.append("Run 'Scan Dependencies' again to verify installation")
        state.status = 'success'
    except Exception as e:
        state.logs.append(f"Critical error during dependency installation: {str(e)}")
        state.status = 'failed'
    finally:
        state.process = None


def find_video_in_dir(directory):
    video_extensions = ('.mp4', '.webm', '.avi', '.mov')
    latest_video = None
    latest_time = 0
    if not os.path.isdir(directory):
        state.logs.append(f"Video search directory '{directory}' not found.")
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
    output_xml_path = os.path.join(output_dir, 'output.xml')
    if not os.path.exists(output_xml_path):
        state.logs.append("Warning: output.xml not found for statistics parsing")
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
                        return pass_count, fail_count
        pass_count = 0
        fail_count = 0
        for test in root.findall('.//test'):
            status = test.find('status')
            if status is not None and status.get('status') == 'PASS':
                pass_count += 1
            elif status is not None and status.get('status') == 'FAIL':
                fail_count += 1
        return pass_count, fail_count
    except Exception as e:
        state.logs.append(f"Error parsing output.xml: {e}")
        return 0, 0


def create_variable_file_from_data(timestamp):
    if not state.orchestrator_data: return None
    headers = state.orchestrator_data.get('headers', [])
    data_rows = state.orchestrator_data.get('data', [])
    if not headers or not data_rows: return None
    var_file_path = os.path.join(tempfile.gettempdir(), f'orchestrator_vars_{timestamp}.py')
    with open(var_file_path, 'w', encoding='utf-8') as f:
        f.write("# Auto-generated variable file for Robot Maestro Orchestrator\n\n")
        first_row = data_rows[0]
        for i, header in enumerate(headers):
            var_name = re.sub(r'\W|^(?=\d)', '_', header)
            value = first_row[i] if i < len(first_row) else ""
            f.write(f"{var_name} = {json.dumps(value)}\n")
        f.write("\n# Full data set for looping tests\n")
        f.write("ORCHESTRATOR_DATA = [\n")
        for row in data_rows:
            row_dict = {re.sub(r'\W|^(?=\d)', '_', headers[i]): (row[i] if i < len(row) else "") for i in range(len(headers))}
            f.write(f"    {json.dumps(row_dict)},\n")
        f.write("]\n")
    state.logs.append(f"Created temporary variable file: {var_file_path}")
    return var_file_path


def run_robot_in_thread(command, output_dir, timestamp, project_dir):
    global state
    output_dir = os.path.abspath(output_dir)
    try:
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        preexec_fn = os.setsid if os.name != 'nt' else None
        state.process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', creationflags=creation_flags, preexec_fn=preexec_fn)
        for line in iter(state.process.stdout.readline, ''):
            clean_line = line.strip()
            if clean_line: state.logs.append(clean_line)
        state.process.stdout.close()
        state.return_code = state.process.wait()
        if state.status == "stopped":
            state.logs.append("\nExecution was manually stopped.")
            return
        if os.path.exists(output_dir):
            state.pass_count, state.fail_count = parse_test_statistics_from_xml(output_dir)
        try:
            if os.path.exists(output_dir):
                for f in os.listdir(output_dir):
                    if f.lower() == 'report.html':
                        archived_name = f"report-{timestamp}.html"
                        shutil.move(os.path.join(output_dir, f), os.path.join(REPORTS_DIR, archived_name))
                        state.report_file = archived_name
                    elif f.lower() == 'log.html':
                        archived_name = f"log-{timestamp}.html"
                        shutil.move(os.path.join(output_dir, f), os.path.join(REPORTS_DIR, archived_name))
                        state.log_file = archived_name
            project_root = os.path.dirname(os.path.abspath(project_dir))
            video_search_dir = os.path.join(project_root, 'Execution_Videos')
            new_video_path = find_video_in_dir(video_search_dir)
            if new_video_path:
                video_ext = os.path.splitext(new_video_path)[1]
                archived_video_name = f"video-{timestamp}{video_ext}"
                shutil.move(new_video_path, os.path.join(REPORTS_DIR, archived_video_name))
                state.video_file = archived_video_name
                state.logs.append(f"Successfully archived video '{os.path.basename(new_video_path)}' to {state.video_file}")
            else:
                state.logs.append("No video file found in 'Execution_Videos' directory.")
        except Exception as e:
            state.logs.append(f"\nError during report/video archiving: {e}")
        state.status = 'success' if state.return_code == 0 else 'failed'
        state.logs.append(f"\nExecution Result: {state.status.upper()} (Exit Code {state.return_code})")
    except FileNotFoundError:
        state.logs.append("\nCRITICAL ERROR: 'robot' command not found. Please ensure Robot Framework is installed and in your system's PATH.")
        state.status = "failed"
    except Exception as e:
        state.logs.append(f"CRITICAL ERROR in execution thread: {e}")
        if state.status == "running": state.status = "failed"
    finally:
        state.process = None
        if os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir)
            except Exception as e:
                state.logs.append(f"Warning: Failed to clean up temp directory {output_dir}")


def find_matching_report_file(requested_filename, reports_dir):
    clean_requested = requested_filename.split('#')[0].split('?')[0]
    if os.path.exists(os.path.join(reports_dir, clean_requested)):
        return clean_requested
    if clean_requested.lower() in ['log.html', 'report.html']:
        file_type = 'log' if clean_requested.lower() == 'log.html' else 'report'
        matching_files = []
        try:
            for f in os.listdir(reports_dir):
                if f.lower().startswith(f'{file_type}-') and f.lower().endswith('.html'):
                    matching_files.append((f, os.path.getmtime(os.path.join(reports_dir, f))))
        except OSError:
            return None
        if matching_files:
            matching_files.sort(key=lambda x: x[1], reverse=True)
            return matching_files[0][0]
    return None


@app.route('/list-suites', methods=['GET'])
def list_suites():
    global TESTS_DIRECTORY
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        return jsonify({"error": "Test directory not set. Please upload a project."}), 404
    suites = []
    try:
        for root, _, files in os.walk(TESTS_DIRECTORY):
            for file in files:
                if file.endswith('.robot'):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, TESTS_DIRECTORY)
                    test_cases = parse_robot_file(file_path)
                    if test_cases:
                        suites.append({"name": relative_path.replace('\\', '/'), "testCases": test_cases})
        suites.sort(key=lambda x: x['name'])
        return jsonify(suites)
    except Exception as e:
        return jsonify({"error": f"Failed to scan for suites: {str(e)}"}), 500


@app.route('/scan-dependencies', methods=['GET'])
def scan_dependencies_endpoint():
    try:
        result = scan_dependencies()
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'error': f'Failed to scan dependencies: {str(e)}'}), 500


@app.route('/install-dependencies', methods=['POST'])
def install_dependencies():
    global state
    if state.status == "running":
        return jsonify({"status": "error", "message": "Another operation is already in progress."}), 409
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
        return jsonify({"status": "running", "message": f"Installing {len(missing_packages)} missing dependencies..."})
    except Exception as e:
        state.reset()
        return jsonify({"status": "error", "message": f"Failed to start dependency installation: {str(e)}"}), 500


@app.route('/run', methods=['POST'])
def run_robot_tests():
    global state
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        return jsonify({"status": "error", "message": "Cannot run tests: No project uploaded or test directory not found."}), 400
    if state.status == "running":
        return jsonify({"status": "error", "message": "Another execution is already in progress."}), 409
    try:
        data = request.get_json()
        if not data: return jsonify({"status": "error", "message": "No data provided"}), 400
        state.reset()
        state.status = "running"
        runType = data.get('runType')
        config = data.get('config', {})
        if runType == 'Orchestrator' and 'orchestratorData' in config:
            state.orchestrator_data = config['orchestratorData']
            state.logs.append("Received orchestrator data. Sorting by priority...")
            headers = state.orchestrator_data.get('headers', [])
            data_rows = state.orchestrator_data.get('data', [])
            try:
                priority_index = -1
                for i, header in enumerate(headers):
                    if str(header).lower() == 'priority':
                        priority_index = i
                        break
                if priority_index != -1:
                    priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
                    indexed_rows = list(enumerate(data_rows))
                    def sort_key(indexed_row_tuple):
                        original_index, row_data = indexed_row_tuple
                        priority_val = str(row_data[priority_index]).upper()
                        priority_numeric = priority_order.get(priority_val, 99)
                        return (priority_numeric, original_index)
                    indexed_rows.sort(key=sort_key)
                    sorted_data_rows = [row for index, row in indexed_rows]
                    state.orchestrator_data['data'] = sorted_data_rows
                    state.logs.append("Successfully sorted data by priority (P0-P3) while maintaining original order for ties.")
                else:
                    state.logs.append("Warning: 'priority' column not found in data. Executing in original order.")
            except Exception as e:
                state.logs.append(f"Error during priority sorting: {e}. Executing in original order.")
        else:
            state.orchestrator_data = None
        tests_to_run_path = TESTS_DIRECTORY
        command = ['robot']
        timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        output_dir = os.path.abspath(os.path.join(SCRIPT_DIR, f'temp_output_{timestamp}'))
        command.extend(['--outputdir', output_dir])
        variable_file_to_cleanup = None
        if runType == 'By Tag':
            if config.get('includeTags'): command.extend(['-i', config['includeTags']])
            if config.get('excludeTags'): command.extend(['-e', config['excludeTags']])
        elif runType == 'By Suite' and config.get('suite'):
            suite_path = os.path.join(TESTS_DIRECTORY, config['suite'].replace('/', os.sep))
            if os.path.isfile(suite_path): tests_to_run_path = suite_path
            else: return jsonify({"status": "error", "message": f"Suite file not found: {suite_path}"}), 404
        elif runType == 'By Test Case' and config.get('testcase'):
            command.extend(['-t', config['testcase']])
        elif runType == 'Orchestrator':
            variable_file_to_cleanup = create_variable_file_from_data(timestamp)
            if variable_file_to_cleanup: command.extend(['--variablefile', variable_file_to_cleanup])
            else: state.logs.append("Warning: Orchestrator run requested but no data was available.")
        command.append(tests_to_run_path)
        state.logs.append("="*80)
        state.logs.append(f"Executing command: {' '.join(command)}")
        state.logs.append("="*80)
        thread = Thread(target=run_robot_in_thread, args=(command, output_dir, timestamp, TESTS_DIRECTORY))
        thread.daemon = True
        thread.start()
        if variable_file_to_cleanup:
            try:
                time.sleep(2) 
                os.remove(variable_file_to_cleanup)
            except Exception as e:
                state.logs.append(f"Warning: Failed to clean up temp variable file {variable_file_to_cleanup}: {e}")
        return jsonify({"status": "running", "message": "Execution started."})
    except Exception as e:
        state.reset()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/status', methods=['GET'])
def get_status():
    global state
    return jsonify({
        "status": state.status, "logs": list(state.logs), "pass_count": state.pass_count,
        "fail_count": state.fail_count, "reportFile": state.report_file,
        "logFile": state.log_file, "videoFile": state.video_file
    })


@app.route('/stop', methods=['POST'])
def stop_robot_tests():
    global state
    if state.process and state.process.poll() is None:
        try:
            if state.status == "running": state.status = "stopped"
            if os.name == 'nt':
                 state.process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                 os.killpg(os.getpgid(state.process.pid), signal.SIGTERM)
            state.logs.append("--- Stop signal sent to process ---")
            return jsonify({"status": "success", "message": "Stop signal sent."}), 200
        except Exception as e:
            state.logs.append(f"--- Error stopping process: {e} ---")
            return jsonify({"status": "error", "message": f"Failed to stop process: {e}"}), 500
    else:
        return jsonify({"status": "info", "message": "No execution running to stop."}), 200


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
        clean_filename = filename.split('#')[0].split('?')[0]
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        if not actual_filename: return jsonify({"error": f"File not found: {clean_filename}"}), 404
        return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=True)
    except Exception as e:
        return jsonify({"error": f"Error downloading file: {str(e)}"}), 500


@app.route('/stream-video/<filename>', methods=['GET'])
def stream_video(filename):
    try:
        clean_filename = filename.split('#')[0].split('?')[0]
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        if not actual_filename: return jsonify({"error": f"Video not found: {clean_filename}"}), 404
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        if not actual_filename.lower().endswith(('.mp4', '.webm', '.avi', '.mov')):
            return jsonify({"error": "Not a video file"}), 400
        file_size = os.path.getsize(file_path)
        range_header = request.headers.get('Range', None)
        if range_header:
            byte_start, byte_end = 0, file_size - 1
            range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
            if range_match:
                byte_start = int(range_match.group(1))
                if range_match.group(2): byte_end = int(range_match.group(2))
            content_length = byte_end - byte_start + 1
            with open(file_path, 'rb') as video_file:
                video_file.seek(byte_start)
                data = video_file.read(content_length)
            response = make_response(data)
            response.status_code = 206
            response.headers['Content-Range'] = f'bytes {byte_start}-{byte_end}/{file_size}'
        else:
            with open(file_path, 'rb') as video_file: data = video_file.read()
            response = make_response(data)
            response.status_code = 200
        response.headers['Content-Length'] = str(response.data.get_data().__len__())
        response.headers['Accept-Ranges'] = 'bytes'
        if actual_filename.lower().endswith('.mp4'): response.headers['Content-Type'] = 'video/mp4'
        elif actual_filename.lower().endswith('.webm'): response.headers['Content-Type'] = 'video/webm'
        return response
    except Exception as e:
        return jsonify({"error": f"Error streaming video: {str(e)}"}), 500


@app.route('/reports/<path:subpath>', methods=['GET'])
def get_report_with_path(subpath):
    # This route is a bit of a catch-all to handle requests from within the HTML reports
    return get_report(subpath)

@app.route('/reports/<filename>', methods=['GET'])
def get_report(filename):
    try:
        clean_filename = filename.split('#')[0].split('?')[0]
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        actual_filename = find_matching_report_file(clean_filename, REPORTS_DIR)
        if not actual_filename:
            return jsonify({"error": f"File not found: {clean_filename}"}), 404
        return send_from_directory(REPORTS_DIR, actual_filename)
    except Exception as e:
        return jsonify({"error": f"Error serving file: {str(e)}"}), 500


@app.route('/delete-report/<filename>', methods=['DELETE'])
def delete_report(filename):
    try:
        clean_filename = filename.split('#')[0].split('?')[0]
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        file_path = os.path.join(REPORTS_DIR, clean_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"success": f"Deleted {clean_filename}"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)

    