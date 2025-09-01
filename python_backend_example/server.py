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

# IMPORTANT: You MUST change this path to the ABSOLUTE path of your Robot Framework project folder.
# This is the directory that contains your .robot files.
# Example for Windows: TESTS_DIRECTORY = 'C:/Users/YourUser/Documents/RobotMaestro/tests'
# Example for macOS/Linux: TESTS_DIRECTORY = '/Users/YourUser/Documents/RobotMaestro/tests'
TESTS_DIRECTORY = 'C:/Users/c-aku/GitLab/qa-automation-hub-robot-framework/primecenter_automation/tests' # A default example path

if not os.path.exists(TESTS_DIRECTORY):
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    print("!!! WARNING: `TESTS_DIRECTORY` does not exist.       !!!")
    print(f"!!! Default path set to: {TESTS_DIRECTORY}")
    print("!!! Please edit `server.py` and set this variable.   !!!")
    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")


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
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Handle different requirement formats
                # Example formats: package==1.0.0, package>=1.0.0, package, -e git+https://...
                if line.startswith('-e') or line.startswith('git+'):
                    # Skip editable installs and git repositories for now
                    continue
                
                # Remove inline comments
                if '#' in line:
                    line = line.split('#')[0].strip()
                
                # Extract package name and version requirement
                # Handle operators: ==, >=, >, <=, <, ~=, !=
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
    for root, dirs, files in os.walk(search_directory):
        for file in files:
            if file.lower() in ['requirements.txt', 'requirements-dev.txt', 'requirements-test.txt']:
                requirements_files.append(os.path.join(root, file))
    return requirements_files


def check_version_compatibility(installed_version, version_spec):
    """Check if installed version meets the requirement specification."""
    if not version_spec:
        return True  # No version specified, any version is fine
    
    try:
        from packaging import version, specifiers
        spec = specifiers.SpecifierSet(version_spec)
        return version.parse(installed_version) in spec
    except ImportError:
        # Fallback to simple string comparison if packaging module not available
        if version_spec.startswith('=='):
            required_version = version_spec[2:]
            return installed_version == required_version
        elif version_spec.startswith('>='):
            # Simple comparison - not perfect but better than nothing
            return True
        else:
            return True
    except Exception as e:
        print(f"Error checking version compatibility: {e}")
        return True  # Assume compatible if we can't determine


def scan_dependencies():
    """Scan for missing dependencies and return analysis."""
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
        # Get currently installed packages
        installed_packages = get_installed_packages()
        result['installed_packages_count'] = len(installed_packages)
        
        # Find all requirements files in the repository
        project_root = os.path.dirname(os.path.abspath(TESTS_DIRECTORY))
        requirements_files = find_requirements_files(project_root)
        
        # Also check in the current script directory
        current_dir_req = find_requirements_files(SCRIPT_DIR)
        requirements_files.extend(current_dir_req)
        
        # Remove duplicates
        requirements_files = list(set(requirements_files))
        result['requirements_files'] = requirements_files
        
        if not requirements_files:
            result['suggestions'].append("No requirements.txt files found in the repository")
            result['suggestions'].append(f"Searched in: {project_root} and {SCRIPT_DIR}")
            return result
        
        # Process each requirements file
        all_required_packages = {}
        for req_file in requirements_files:
            required_packages = parse_requirements_file(req_file)
            for pkg_name, pkg_info in required_packages.items():
                if pkg_name not in all_required_packages:
                    all_required_packages[pkg_name] = pkg_info
                    all_required_packages[pkg_name]['source_file'] = req_file
        
        # Check for missing packages and version conflicts
        for pkg_name, pkg_info in all_required_packages.items():
            if pkg_name not in installed_packages:
                result['missing_packages'].append({
                    'name': pkg_name,
                    'required_spec': pkg_info['version_spec'],
                    'source_file': os.path.basename(pkg_info['source_file']),
                    'raw_line': pkg_info['raw_line']
                })
            else:
                # Check version compatibility
                installed_version = installed_packages[pkg_name]
                if pkg_info['version_spec'] and not check_version_compatibility(installed_version, pkg_info['version_spec']):
                    result['version_conflicts'].append({
                        'name': pkg_name,
                        'installed_version': installed_version,
                        'required_spec': pkg_info['version_spec'],
                        'source_file': os.path.basename(pkg_info['source_file']),
                        'raw_line': pkg_info['raw_line']
                    })
        
        # Generate suggestions
        if result['missing_packages']:
            result['suggestions'].append(f"Found {len(result['missing_packages'])} missing packages")
            result['suggestions'].append("Use the 'Install Missing Dependencies' button to install them")
        
        if result['version_conflicts']:
            result['suggestions'].append(f"Found {len(result['version_conflicts'])} version conflicts")
            result['suggestions'].append("Consider updating packages to resolve version conflicts")
        
        if not result['missing_packages'] and not result['version_conflicts']:
            result['suggestions'].append("All dependencies appear to be satisfied!")
    
    except Exception as e:
        result['status'] = 'error'
        result['errors'].append(f"Error during dependency scan: {str(e)}")
    
    return result


def install_missing_dependencies_thread(missing_packages):
    """Install missing dependencies in a separate thread."""
    global state
    
    try:
        state.logs.append("==============================================================================")
        state.logs.append("DEPENDENCY INSTALLATION STARTED")
        state.logs.append("==============================================================================")
        
        for i, pkg_info in enumerate(missing_packages, 1):
            pkg_line = pkg_info['raw_line']
            state.logs.append(f"\n[{i}/{len(missing_packages)}] Installing: {pkg_line}")
            
            # Use pip to install the package
            cmd = ['pip', 'install', pkg_line]
            
            try:
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding='utf-8',
                    errors='replace'
                )
                
                # Read output line by line
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
        
        state.logs.append("\n==============================================================================")
        state.logs.append("DEPENDENCY INSTALLATION COMPLETED")
        state.logs.append("==============================================================================")
        state.logs.append("Run 'Scan Dependencies' again to verify installation")
        
        state.status = 'success'
        
    except Exception as e:
        state.logs.append(f"Critical error during dependency installation: {str(e)}")
        state.status = 'failed'
    finally:
        state.process = None


def find_video_in_dir(directory):
    """Finds the most recently modified video file in a directory."""
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
    """Parse test statistics from Robot Framework's output.xml file."""
    output_xml_path = os.path.join(output_dir, 'output.xml')
    
    if not os.path.exists(output_xml_path):
        state.logs.append("Warning: output.xml not found for statistics parsing")
        return 0, 0
    
    try:
        tree = ET.parse(output_xml_path)
        root = tree.getroot()
        
        # Method 1: Look for statistics in the statistics section
        for statistics in root.findall('.//statistics'):
            for total in statistics.findall('.//total'):
                for stat in total.findall('stat'):
                    if stat.get('id') == 'All Tests':
                        pass_count = int(stat.get('pass', 0))
                        fail_count = int(stat.get('fail', 0))
                        state.logs.append(f"Statistics from output.xml - Pass: {pass_count}, Fail: {fail_count}")
                        return pass_count, fail_count
        
        # Method 2: If statistics section not found, count test elements directly
        pass_count = 0
        fail_count = 0
        for test in root.findall('.//test'):
            status = test.find('status')
            if status is not None:
                if status.get('status') == 'PASS':
                    pass_count += 1
                elif status.get('status') == 'FAIL':
                    fail_count += 1
        
        if pass_count > 0 or fail_count > 0:
            state.logs.append(f"Statistics from test elements - Pass: {pass_count}, Fail: {fail_count}")
            return pass_count, fail_count
        
        state.logs.append("Warning: No test statistics found in output.xml")
        return 0, 0
        
    except ET.ParseError as e:
        state.logs.append(f"Error parsing output.xml: {e}")
        return 0, 0
    except Exception as e:
        state.logs.append(f"Unexpected error reading output.xml: {e}")
        return 0, 0


def create_variable_file_from_data(timestamp):
    """Creates a temporary Python variable file from the orchestrator data."""
    if not state.orchestrator_data:
        return None

    headers = state.orchestrator_data.get('headers', [])
    data_rows = state.orchestrator_data.get('data', [])

    if not headers or not data_rows:
        return None

    var_file_path = os.path.join(tempfile.gettempdir(), f'orchestrator_vars_{timestamp}.py')

    with open(var_file_path, 'w', encoding='utf-8') as f:
        f.write("# Auto-generated variable file for Robot Maestro Orchestrator\n\n")
        
        # Write each header as a variable, taking its value from the first data row.
        # This makes single-run data-driven tests easy.
        first_row = data_rows[0]
        for i, header in enumerate(headers):
            # Sanitize header to be a valid Python variable name
            var_name = re.sub(r'\W|^(?=\d)', '_', header)
            value = first_row[i] if i < len(first_row) else ""
            f.write(f"{var_name} = {json.dumps(value)}\n")
            
        # Also provide the full data set as a list of dictionaries for looping tests
        f.write("\n# Full data set for looping tests\n")
        f.write("ORCHESTRATOR_DATA = [\n")
        for row in data_rows:
            row_dict = {re.sub(r'\W|^(?=\d)', '_', headers[i]): (row[i] if i < len(row) else "") for i in range(len(headers))}
            f.write(f"    {json.dumps(row_dict)},\n")
        f.write("]\n")
        
    state.logs.append(f"Created temporary variable file: {var_file_path}")
    return var_file_path


def run_robot_in_thread(command, output_dir, timestamp, project_dir):
    """The target function for the execution thread that runs the robot command."""
    global state
    output_dir = os.path.abspath(output_dir) # Ensure path is absolute

    try:
        # Use CREATE_NEW_PROCESS_GROUP on Windows to allow sending Ctrl+C
        # Use preexec_fn=os.setsid on Unix-like systems to create a new process group
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        preexec_fn = os.setsid if os.name != 'nt' else None

        state.process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, # Redirect stderr to stdout
            text=True,
            encoding='utf-8',
            errors='replace',
            creationflags=creation_flags,
            preexec_fn=preexec_fn
        )

        # Read stdout line by line and log everything
        for line in iter(state.process.stdout.readline, ''):
            clean_line = line.strip()
            if not clean_line:
                continue
            state.logs.append(clean_line)

        state.process.stdout.close()
        state.return_code = state.process.wait()

        # Exit early if the process was stopped to prevent incorrect status reporting
        if state.status == "stopped":
            state.logs.append(f"\nExecution was manually stopped.")
            return

        # --- Get accurate test statistics from output.xml ---
        try:
            if os.path.exists(output_dir):
                pass_count, fail_count = parse_test_statistics_from_xml(output_dir)
                state.pass_count = pass_count
                state.fail_count = fail_count
        except Exception as e:
            state.logs.append(f"Error parsing test statistics: {e}")

        # --- Post Execution Processing ---
        try:
            # 1. Archive Robot Framework artifacts (report.html, log.html)
            if os.path.exists(output_dir):
                for f in os.listdir(output_dir):
                    temp_file_path = os.path.join(output_dir, f)
                    if f.lower() == 'report.html':
                        archived_name = f"report-{timestamp}.html"
                        shutil.move(temp_file_path, os.path.join(REPORTS_DIR, archived_name))
                        state.report_file = archived_name
                        state.logs.append(f"\nSuccessfully archived report to {state.report_file}")
                    elif f.lower() == 'log.html':
                        archived_name = f"log-{timestamp}.html"
                        shutil.move(temp_file_path, os.path.join(REPORTS_DIR, archived_name))
                        state.log_file = archived_name
                        state.logs.append(f"Successfully archived log to {state.log_file}")

            # 2. Find and archive the new video file from the specific directory.
            # Assumes 'Execution_Videos' is in the parent directory of 'project_dir' (TESTS_DIRECTORY)
            project_root = os.path.dirname(os.path.abspath(project_dir))
            video_search_dir = os.path.join(project_root, 'Execution_Videos')
            
            state.logs.append(f"Searching for video in: {video_search_dir}")
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
        state.logs.append("\nCRITICAL ERROR: 'robot' command not found.")
        state.logs.append("Please ensure Robot Framework is installed and in your system's PATH.")
        state.status = "failed"
    except Exception as e:
        print(f"Error in execution thread: {e}")
        state.logs.append(f"CRITICAL ERROR in execution thread: {e}")
        if state.status == "running":
            state.status = "failed"
    finally:
        state.process = None
        # Always try to clean up the temporary directory
        if os.path.exists(output_dir):
            try:
                shutil.rmtree(output_dir)
                state.logs.append(f"Cleaned up temporary directory: {output_dir}")
            except Exception as e:
                print(f"Failed to clean up temp directory {output_dir}: {e}")
                state.logs.append(f"Warning: Failed to clean up temp directory {output_dir}")


def find_matching_report_file(requested_filename, reports_dir):
    """Find the actual report file that matches the requested filename pattern."""
    # Clean the requested filename
    clean_requested = requested_filename.split('#')[0].split('?')[0]
    
    # If the exact file exists, return it
    exact_path = os.path.join(reports_dir, clean_requested)
    if os.path.exists(exact_path):
        return clean_requested
    
    # If requesting log.html or report.html, find the most recent timestamped version
    if clean_requested.lower() in ['log.html', 'report.html']:
        file_type = 'log' if clean_requested.lower() == 'log.html' else 'report'
        
        # Find all files matching the pattern (e.g., log-TIMESTAMP.html)
        matching_files = []
        try:
            for f in os.listdir(reports_dir):
                if f.lower().startswith(f'{file_type}-') and f.lower().endswith('.html'):
                    file_path = os.path.join(reports_dir, f)
                    matching_files.append((f, os.path.getmtime(file_path)))
        except OSError:
            return None
        
        if matching_files:
            # Sort by modification time, newest first
            matching_files.sort(key=lambda x: x[1], reverse=True)
            return matching_files[0][0]  # Return the newest file
    
    return None


@app.route('/list-suites', methods=['GET'])
def list_suites():
    """Scans the configured test directory and returns a list of suites and their test cases."""
    if not os.path.isdir(TESTS_DIRECTORY):
        return jsonify({"error": f"Configured TESTS_DIRECTORY is not a valid directory: {TESTS_DIRECTORY}"}), 500

    suites = []
    try:
        for root, _, files in os.walk(TESTS_DIRECTORY):
            for file in files:
                if file.endswith('.robot'):
                    file_path = os.path.join(root, file)
                    # Create a relative name for the suite to show in the UI
                    relative_path = os.path.relpath(file_path, TESTS_DIRECTORY)
                    test_cases = parse_robot_file(file_path)
                    if test_cases:
                        suites.append({
                            "name": relative_path.replace('\\', '/'), # Normalize path for UI
                            "testCases": test_cases
                        })
        # Sort suites alphabetically by name
        suites.sort(key=lambda x: x['name'])
        return jsonify(suites)
    except Exception as e:
        return jsonify({"error": f"Failed to scan for suites: {str(e)}"}), 500


@app.route('/scan-dependencies', methods=['GET'])
def scan_dependencies_endpoint():
    """Endpoint to scan for missing dependencies."""
    try:
        result = scan_dependencies()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': f'Failed to scan dependencies: {str(e)}'
        }), 500


@app.route('/install-dependencies', methods=['POST'])
def install_dependencies():
    """Endpoint to install missing dependencies."""
    global state
    
    if state.status == "running":
        return jsonify({
            "status": "error", 
            "message": "Another operation is already in progress."
        }), 409
    
    try:
        data = request.get_json()
        missing_packages = data.get('missing_packages', [])
        
        if not missing_packages:
            return jsonify({
                "status": "error", 
                "message": "No packages to install"
            }), 400
        
        # Reset state for dependency installation
        state.reset()
        state.status = "running"
        
        # Start installation in separate thread
        thread = Thread(target=install_missing_dependencies_thread, args=(missing_packages,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "status": "running", 
            "message": f"Installing {len(missing_packages)} missing dependencies..."
        })
        
    except Exception as e:
        state.reset()
        return jsonify({
            "status": "error", 
            "message": f"Failed to start dependency installation: {str(e)}"
        }), 500


@app.route('/run', methods=['POST'])
def run_robot_tests():
    global state
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        return jsonify({"status": "error", "message": "Cannot run tests: `TESTS_DIRECTORY` is not configured correctly in `server.py`."}), 400

    if state.status == "running":
        return jsonify({"status": "error", "message": "Another execution is already in progress."}), 409

    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400

        state.reset()
        state.status = "running"

        runType = data.get('runType')
        config = data.get('config', {})
        
        # Store and sort orchestrator data if provided
        if runType == 'Orchestrator' and 'orchestratorData' in config:
            state.orchestrator_data = config['orchestratorData']
            state.logs.append("Received orchestrator data. Sorting by priority...")

            headers = state.orchestrator_data.get('headers', [])
            data_rows = state.orchestrator_data.get('data', [])
            
            try:
                # Find the index of the 'priority' column (case-insensitive)
                priority_index = -1
                for i, header in enumerate(headers):
                    if str(header).lower() == 'priority':
                        priority_index = i
                        break

                if priority_index != -1:
                    # Define the order for sorting priorities
                    priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
                    
                    # Sort the data rows based on the priority column
                    # Unrecognized priorities are placed at the end (treated as higher index)
                    def sort_key(row):
                        priority_val = row[priority_index].upper()
                        return priority_order.get(priority_val, 99)

                    data_rows.sort(key=sort_key)
                    state.orchestrator_data['data'] = data_rows
                    state.logs.append("Successfully sorted data by priority: P0, P1, P2, P3.")
                else:
                    state.logs.append("Warning: 'priority' column not found in data. Executing in original order.")
            
            except Exception as e:
                state.logs.append(f"Error during priority sorting: {e}. Executing in original order.")

        else:
            state.orchestrator_data = None

        # This will be the final path passed to the robot command
        tests_to_run_path = TESTS_DIRECTORY

        # --- Command Construction (Real) ---
        command = ['robot']
        timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        # Use an absolute path for the temporary output directory
        output_dir = os.path.abspath(os.path.join(SCRIPT_DIR, f'temp_output_{timestamp}'))

        command.extend(['--outputdir', output_dir])
        
        variable_file_to_cleanup = None

        if runType == 'By Tag':
            if config.get('includeTags'):
                command.extend(['-i', config['includeTags']])
            if config.get('excludeTags'):
                command.extend(['-e', config['excludeTags']])
        elif runType == 'By Suite' and config.get('suite'):
            # When running by suite, we need to construct the full path to the suite file
            suite_path = os.path.join(TESTS_DIRECTORY, config['suite'].replace('/', os.sep))
            if os.path.isfile(suite_path):
                tests_to_run_path = suite_path # We run this specific file
            else:
                 return jsonify({"status": "error", "message": f"Suite file not found: {suite_path}"}), 404
        elif runType == 'By Test Case' and config.get('testcase'):
            command.extend(['-t', config['testcase']])
        elif runType == 'Orchestrator':
            # The sorting happens before this point, now we just create the file
            variable_file_to_cleanup = create_variable_file_from_data(timestamp)
            if variable_file_to_cleanup:
                command.extend(['--variablefile', variable_file_to_cleanup])
            else:
                state.logs.append("Warning: Orchestrator run requested but no data was available to create a variable file.")


        # The last argument to the command is the path to the tests to run
        command.append(tests_to_run_path)

        state.logs.append("==============================================================================")
        state.logs.append(f"Executing command: {' '.join(command)}")
        state.logs.append("==============================================================================")

        # --- Start non-blocking execution in a separate thread ---
        thread = Thread(target=run_robot_in_thread, args=(command, output_dir, timestamp, TESTS_DIRECTORY))
        thread.daemon = True
        thread.start()
        
        # Clean up the variable file after a delay to ensure robot has loaded it
        if variable_file_to_cleanup:
            # This is a simple cleanup. A more robust solution might wait for the thread.
            # But for now, just remove it after starting.
            try:
                # Add a small delay
                time.sleep(2) 
                os.remove(variable_file_to_cleanup)
                state.logs.append(f"Cleaned up temporary variable file: {variable_file_to_cleanup}")
            except Exception as e:
                state.logs.append(f"Warning: Failed to clean up temp variable file {variable_file_to_cleanup}: {e}")


        return jsonify({"status": "running", "message": "Execution started."})

    except Exception as e:
        print(f"A critical error occurred in the Flask server: {e}")
        state.reset() # Reset state on error
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/status', methods=['GET'])
def get_status():
    """Endpoint for the frontend to poll for execution status and logs."""
    global state
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
    global state
    if state.process and state.process.poll() is None:
        try:
            print(f"--- Terminating Process Group PID: {state.process.pid} ---")
            if state.status == "running": # Only change status if it was running
                state.status = "stopped"

            if os.name == 'nt':
                 # Sends a Ctrl+Break signal to the process group on Windows
                 state.process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                 # Sends SIGTERM to the entire process group on Unix-like systems
                 os.killpg(os.getpgid(state.process.pid), signal.SIGTERM)

            # Let the execution thread handle the final cleanup and status update
            state.logs.append("--- Stop signal sent to process ---")
            return jsonify({"status": "success", "message": "Stop signal sent."}), 200
        except Exception as e:
            print(f"Error stopping process: {e}")
            state.logs.append(f"--- Error stopping process: {e} ---")
            # Don't change status to failed, as the process might be dead already
            return jsonify({"status": "error", "message": f"Failed to stop process: {e}"}), 500
    else:
        return jsonify({"status": "info", "message": "No execution running to stop."}), 200


@app.route('/reports', methods=['GET'])
def list_reports():
    try:
        files = os.listdir(REPORTS_DIR)
        # Sort files by modification time, newest first
        files.sort(key=lambda x: os.path.getmtime(os.path.join(REPORTS_DIR, x)), reverse=True)
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/download-report/<filename>', methods=['GET'])
def download_report(filename):
    """Download report files, including videos, as attachments."""
    try:
        # Clean the filename - remove any URL fragments or query parameters
        clean_filename = filename.split('#')[0].split('?')[0]
        
        # Security check: ensure the filename doesn't contain path traversal attempts
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Try to find the matching file (handles timestamped files)
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        
        if not actual_filename:
            return jsonify({"error": f"File not found: {clean_filename}"}), 404
        
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        
        # Force download by setting Content-Disposition header
        return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=True)
            
    except Exception as e:
        print(f"Error downloading file {filename}: {e}")
        return jsonify({"error": f"Error downloading file: {str(e)}"}), 500


@app.route('/stream-video/<filename>', methods=['GET'])
def stream_video(filename):
    """Stream video files with proper headers for browser playback."""
    try:
        # Clean the filename
        clean_filename = filename.split('#')[0].split('?')[0]
        
        # Security check
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Try to find the matching file
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        
        if not actual_filename:
            return jsonify({"error": f"Video not found: {clean_filename}"}), 404
        
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "Video file not found"}), 404
        
        # Check if it's actually a video file
        if not actual_filename.lower().endswith(('.mp4', '.webm', '.avi', '.mov')):
            return jsonify({"error": "Not a video file"}), 400
        
        # Get file size for range requests
        file_size = os.path.getsize(file_path)
        
        # Handle range requests for video streaming
        range_header = request.headers.get('Range', None)
        if range_header:
            byte_start = 0
            byte_end = file_size - 1
            
            # Parse range header
            range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
            if range_match:
                byte_start = int(range_match.group(1))
                if range_match.group(2):
                    byte_end = int(range_match.group(2))
            
            # Ensure valid range
            byte_start = max(0, byte_start)
            byte_end = min(file_size - 1, byte_end)
            content_length = byte_end - byte_start + 1
            
            # Read the requested byte range
            with open(file_path, 'rb') as video_file:
                video_file.seek(byte_start)
                data = video_file.read(content_length)
            
            response = make_response(data)
            response.status_code = 206
            response.headers['Content-Range'] = f'bytes {byte_start}-{byte_end}/{file_size}'
            response.headers['Accept-Ranges'] = 'bytes'
            response.headers['Content-Length'] = str(content_length)
            
        else:
            # Serve entire file
            with open(file_path, 'rb') as video_file:
                data = video_file.read()
            
            response = make_response(data)
            response.status_code = 200
            response.headers['Content-Length'] = str(file_size)
        
        # Set appropriate content type
        if actual_filename.lower().endswith('.mp4'):
            response.headers['Content-Type'] = 'video/mp4'
        elif actual_filename.lower().endswith('.webm'):
            response.headers['Content-Type'] = 'video/webm'
        elif actual_filename.lower().endswith('.avi'):
            response.headers['Content-Type'] = 'video/x-msvideo'
        elif actual_filename.lower().endswith('.mov'):
            response.headers['Content-Type'] = 'video/quicktime'
        else:
            response.headers['Content-Type'] = 'video/mp4'  # Default
        
        # Add caching headers for better performance
        response.headers['Cache-Control'] = 'public, max-age=3600'
        response.headers['Accept-Ranges'] = 'bytes'
        
        return response
        
    except Exception as e:
        print(f"Error streaming video {filename}: {e}")
        return jsonify({"error": f"Error streaming video: {str(e)}"}), 500


@app.route('/video-info/<filename>', methods=['GET'])
def get_video_info(filename):
    """Get information about a video file."""
    try:
        # Clean the filename
        clean_filename = filename.split('#')[0].split('?')[0]
        
        # Security check
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Try to find the matching file
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        
        if not actual_filename:
            return jsonify({"error": f"Video not found: {clean_filename}"}), 404
        
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "Video file not found"}), 404
        
        # Check if it's actually a video file
        if not actual_filename.lower().endswith(('.mp4', '.webm', '.avi', '.mov')):
            return jsonify({"error": "Not a video file"}), 400
        
        # Get file information
        file_stats = os.stat(file_path)
        file_size = file_stats.st_size
        modification_time = datetime.datetime.fromtimestamp(file_stats.st_mtime).isoformat()
        
        # Determine video type
        video_type = 'video/mp4'
        if actual_filename.lower().endswith('.webm'):
            video_type = 'video/webm'
        elif actual_filename.lower().endswith('.avi'):
            video_type = 'video/x-msvideo'
        elif actual_filename.lower().endswith('.mov'):
            video_type = 'video/quicktime'
        
        return jsonify({
            "filename": actual_filename,
            "size": file_size,
            "size_mb": round(file_size / (1024 * 1024), 2),
            "type": video_type,
            "modified": modification_time,
            "stream_url": f"/stream-video/{actual_filename}",
            "download_url": f"/download-report/{actual_filename}"
        })
        
    except Exception as e:
        print(f"Error getting video info for {filename}: {e}")
        return jsonify({"error": f"Error getting video info: {str(e)}"}), 500


@app.route('/reports/<filename>', methods=['GET'])
def get_report(filename):
    """Serve report files. Handle both direct file access and files with fragments."""
    try:
        # Clean the filename - remove any URL fragments or query parameters
        clean_filename = filename.split('#')[0].split('?')[0]
        
        # Security check: ensure the filename doesn't contain path traversal attempts
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Try to find the matching file (handles timestamped files)
        actual_filename = find_matching_report_file(filename, REPORTS_DIR)
        
        if not actual_filename:
            return jsonify({"error": f"File not found: {clean_filename}"}), 404
        
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        
        # Serve the file with appropriate MIME type
        if actual_filename.endswith('.html'):
            # Read and modify the HTML content to fix internal links
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                
                # Fix internal links in the HTML content
                # Replace references to log.html with the actual timestamped log file
                if 'report-' in actual_filename:  # This is a report file
                    # Extract timestamp from report filename
                    timestamp_match = re.search(r'report-(\d{8}-\d{6})\.html', actual_filename)
                    if timestamp_match:
                        timestamp = timestamp_match.group(1)
                        log_filename = f"log-{timestamp}.html"
                        
                        # Check if the corresponding log file exists
                        log_file_path = os.path.join(REPORTS_DIR, log_filename)
                        if os.path.exists(log_file_path):
                            # Replace log.html references with the timestamped version
                            html_content = html_content.replace('log.html', log_filename)
                
                elif 'log-' in actual_filename:  # This is a log file
                    # Extract timestamp from log filename  
                    timestamp_match = re.search(r'log-(\d{8}-\d{6})\.html', actual_filename)
                    if timestamp_match:
                        timestamp = timestamp_match.group(1)
                        report_filename = f"report-{timestamp}.html"
                        
                        # Check if the corresponding report file exists
                        report_file_path = os.path.join(REPORTS_DIR, report_filename)
                        if os.path.exists(report_file_path):
                            # Replace report.html references with the timestamped version
                            html_content = html_content.replace('report.html', report_filename)
                
                # Create response with modified content
                response = make_response(html_content)
                response.headers['Content-Type'] = 'text/html; charset=utf-8'
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
                return response
                
            except Exception as e:
                print(f"Error modifying HTML content: {e}")
                # Fallback to serving the file directly
                response = send_from_directory(REPORTS_DIR, actual_filename, as_attachment=False)
                response.headers['Content-Type'] = 'text/html; charset=utf-8'
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
                return response
                
        elif actual_filename.endswith(('.mp4', '.webm', '.avi', '.mov')):
            # For video files, redirect to the streaming endpoint
            return redirect(f'/stream-video/{actual_filename}')
        else:
            return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=False)
            
    except Exception as e:
        print(f"Error serving file {filename}: {e}")
        return jsonify({"error": f"Error serving file: {str(e)}"}), 500


@app.route('/reports/<path:subpath>', methods=['GET'])
def get_report_with_path(subpath):
    """Handle report URLs that might have additional path components or fragments."""
    try:
        # Extract the base filename from the subpath
        # This handles cases like "log.html#s1-s1-t1"
        base_filename = subpath.split('/')[0].split('#')[0].split('?')[0]
        
        # Security check
        if '..' in base_filename or '\\' in base_filename:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Try to find the matching file (handles timestamped files)
        actual_filename = find_matching_report_file(base_filename, REPORTS_DIR)
        
        if not actual_filename:
            return jsonify({"error": f"File not found: {base_filename}"}), 404
        
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        
        if actual_filename.endswith('.html'):
            # Read and modify the HTML content to fix internal links
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                
                # Fix internal links in the HTML content
                # Replace references to log.html with the actual timestamped log file
                if 'report-' in actual_filename:  # This is a report file
                    timestamp_match = re.search(r'report-(\d{8}-\d{6})\.html', actual_filename)
                    if timestamp_match:
                        timestamp = timestamp_match.group(1)
                        log_filename = f"log-{timestamp}.html"
                        
                        if os.path.exists(os.path.join(REPORTS_DIR, log_filename)):
                            html_content = html_content.replace('log.html', log_filename)
                
                elif 'log-' in actual_filename:  # This is a log file
                    timestamp_match = re.search(r'log-(\d{8}-\d{6})\.html', actual_filename)
                    if timestamp_match:
                        timestamp = timestamp_match.group(1)
                        report_filename = f"report-{timestamp}.html"
                        
                        if os.path.exists(os.path.join(REPORTS_DIR, report_filename)):
                            html_content = html_content.replace('report.html', report_filename)
                
                response = make_response(html_content)
                response.headers['Content-Type'] = 'text/html; charset=utf-8'
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
                return response
                
            except Exception as e:
                print(f"Error modifying HTML content: {e}")
                response = send_from_directory(REPORTS_DIR, actual_filename, as_attachment=False)
                response.headers['Content-Type'] = 'text/html; charset=utf-8'
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
                return response
        else:
            return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=False)
            
    except Exception as e:
        print(f"Error serving file with path {subpath}: {e}")
        return jsonify({"error": f"Error serving file: {str(e)}"}), 500


@app.route('/delete-report/<filename>', methods=['DELETE'])
def delete_report(filename):
    try:
        # Clean the filename
        clean_filename = filename.split('#')[0].split('?')[0]
        
        # Security check
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


# Error handler for 404 errors - useful for debugging
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found", "requested_url": request.url}), 404


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)

    