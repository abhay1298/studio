
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
import logging  # Added for better debugging

# Configure logging
logging.basicConfig(filename='robot_maestro.log', level=logging.DEBUG, 
                   format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# --- Auto-Discovery Functions ---
def find_test_directories(start_path=None, max_depth=5):  # Increased max_depth
    """Automatically find directories containing .robot files."""
    if start_path is None:
        start_path = os.path.dirname(os.path.abspath(__file__))
    
    robot_directories = []
    start_path = Path(start_path)
    
    def search_directory(directory, current_depth=0):
        if current_depth > max_depth:
            return
        
        try:
            robot_files = []
            subdirs = []
            
            logging.debug(f"Scanning directory: {directory}")
            for item in directory.iterdir():
                if item.is_file() and item.suffix.lower() == '.robot':
                    robot_files.append(item.name)
                elif item.is_dir() and not item.name.startswith('.'):
                    subdirs.append(item)
            
            if robot_files:
                robot_directories.append({
                    'path': str(directory.absolute()),
                    'relative_path': str(directory.relative_to(start_path)) if directory != start_path else '.',
                    'robot_files': robot_files,
                    'robot_count': len(robot_files),
                    'depth': current_depth
                })
                logging.debug(f"Found {len(robot_files)} .robot files in {directory}")
            
            for subdir in subdirs:
                search_directory(subdir, current_depth + 1)
                
        except (PermissionError, OSError) as e:
            logging.warning(f"Cannot access directory {directory}: {e}")
    
    search_directory(start_path)
    if not robot_directories:
        logging.info("No directories with .robot files found!")
    robot_directories.sort(key=lambda x: (x['depth'], -x['robot_count']))
    return robot_directories

def get_best_test_directory():
    """Get the most suitable test directory using various heuristics."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    common_test_dirs = [
        'tests', 'test', 'robot', 'robot_tests', 'automation',
        'test_suites', 'suites', 'qa', 'testing'
    ]
    
    search_paths = [
        script_dir,
        os.path.dirname(script_dir),
        os.path.dirname(os.path.dirname(script_dir))
    ]
    
    logging.debug(f"Searching for test directories in: {search_paths}")
    for search_path in search_paths:
        for test_dir_name in common_test_dirs:
            potential_path = os.path.join(search_path, test_dir_name)
            logging.debug(f"Checking directory: {potential_path}")
            if os.path.isdir(potential_path):
                for root, dirs, files in os.walk(potential_path):
                    if any(f.endswith('.robot') for f in files):
                        logging.debug(f"Selected test directory: {potential_path}")
                        return potential_path
    
    robot_dirs = find_test_directories()
    if robot_dirs:
        for dir_info in robot_dirs:
            if any(keyword in dir_info['path'].lower() for keyword in ['test', 'robot', 'automation']):
                logging.debug(f"Selected test directory from auto-discovery: {dir_info['path']}")
                return dir_info['path']
        logging.debug(f"Selected first available directory: {robot_dirs[0]['path']}")
        return robot_dirs[0]['path']
    
    logging.info("No suitable test directory found!")
    return None

def save_test_directory_config(test_dir):
    """Save the discovered test directory to a config file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file = os.path.join(script_dir, 'robot_maestro_config.json')
    
    config = {
        'test_directory': test_dir,
        'auto_discovered': True,
        'last_updated': time.time()
    }
    
    try:
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        logging.info(f"Saved test directory config: {config_file}")
    except Exception as e:
        logging.warning(f"Could not save config file: {e}")

def load_test_directory_config():
    """Load test directory from config file if it exists."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file = os.path.join(script_dir, 'robot_maestro_config.json')
    
    if not os.path.exists(config_file):
        return None
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        test_dir = config.get('test_directory')
        
        if test_dir and os.path.isdir(test_dir):
            has_robot_files = False
            for root, dirs, files in os.walk(test_dir):
                if any(f.endswith('.robot') for f in files):
                    has_robot_files = True
                    break
            
            if has_robot_files:
                logging.debug(f"Loaded test directory from config: {test_dir}")
                return test_dir
        
        os.remove(config_file)
        logging.info(f"Removed invalid config file: {config_file}")
        
    except (json.JSONDecodeError, KeyError, Exception) as e:
        logging.warning(f"Invalid config file, removing it: {e}")
        try:
            os.remove(config_file)
        except:
            pass
    
    return None

def initialize_test_directory():
    """Initialize the test directory using the best available method."""
    test_dir = load_test_directory_config()
    if test_dir:
        print(f"Loaded test directory from config: {test_dir}")
        logging.info(f"Loaded test directory from config: {test_dir}")
        return test_dir, "loaded_from_config"
    
    test_dir = get_best_test_directory()
    if test_dir:
        save_test_directory_config(test_dir)
        print(f"Auto-discovered test directory: {test_dir}")
        logging.info(f"Auto-discovered test directory: {test_dir}")
        return test_dir, "auto_discovered"
    
    print("Failed to initialize test directory")
    logging.info("Failed to initialize test directory")
    return None, "not_found"

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Initialize test directory automatically
print("=" * 60)
print("Robot Maestro - Auto-discovering Test Directory")
logging.info("Robot Maestro - Starting auto-discovery of test directory")
print("=" * 60)

test_dir, method = initialize_test_directory()

if test_dir:
    TESTS_DIRECTORY = test_dir
    print(f"✓ Test directory found: {TESTS_DIRECTORY}")
    print(f"  Discovery method: {method}")
    logging.info(f"Test directory found: {TESTS_DIRECTORY} (Method: {method})")
    
    robot_count = 0
    for root, dirs, files in os.walk(TESTS_DIRECTORY):
        robot_count += len([f for f in files if f.endswith('.robot')])
    
    print(f"  Contains {robot_count} .robot files")
    logging.info(f"Test directory contains {robot_count} .robot files")
    
else:
    print("✗ No test directory found!")
    print("  Place .robot files in 'tests', 'robot', or 'automation' directories")
    print("  Or use API endpoints to configure manually")
    logging.warning("No test directory found")
    TESTS_DIRECTORY = None

print("=" * 60)

REPORTS_DIR = os.path.join(SCRIPT_DIR, 'reports_archive')
if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)
    logging.info(f"Created reports directory: {REPORTS_DIR}")

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

# --- Test Directory Management Endpoints ---
@app.route('/discover-test-directories', methods=['GET'])
def discover_test_directories():
    try:
        max_depth = int(request.args.get('max_depth', 5))
        start_path = request.args.get('start_path', os.path.dirname(os.path.abspath(__file__)))
        robot_dirs = find_test_directories(start_path=start_path, max_depth=max_depth)
        return jsonify({
            'status': 'success',
            'directories': robot_dirs,
            'current_directory': TESTS_DIRECTORY,
            'start_path': start_path,
            'max_depth': max_depth
        })
    except Exception as e:
        logging.error(f"Error discovering directories: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Error discovering directories: {str(e)}'
        }), 500

@app.route('/set-test-directory', methods=['POST'])
def set_test_directory():
    global TESTS_DIRECTORY
    
    try:
        data = request.get_json()
        new_test_dir = data.get('directory')
        
        if not new_test_dir or not os.path.isdir(new_test_dir):
            logging.warning(f"Invalid directory specified: {new_test_dir}")
            return jsonify({'status': 'error', 'message': 'Invalid directory'}), 400
        
        has_robot_files = False
        robot_count = 0
        for root, dirs, files in os.walk(new_test_dir):
            robot_files_in_dir = [f for f in files if f.endswith('.robot')]
            if robot_files_in_dir:
                has_robot_files = True
                robot_count += len(robot_files_in_dir)
        
        if not has_robot_files:
            logging.warning(f"Directory contains no .robot files: {new_test_dir}")
            return jsonify({'status': 'error', 'message': 'Directory contains no .robot files'}), 400
        
        TESTS_DIRECTORY = new_test_dir
        save_test_directory_config(new_test_dir)
        logging.info(f"Test directory set to: {TESTS_DIRECTORY} with {robot_count} .robot files")
        
        return jsonify({
            'status': 'success',
            'message': f'Test directory set: {TESTS_DIRECTORY}',
            'robot_file_count': robot_count
        })
        
    except Exception as e:
        logging.error(f"Error setting test directory: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/test-directory-status', methods=['GET'])
def get_test_directory_status():
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        logging.warning("No test directory configured")
        return jsonify({
            'status': 'error',
            'configured': False,
            'message': 'No test directory configured'
        })
    
    try:
        robot_count = sum(len([f for f in files if f.endswith('.robot')]) 
                         for root, dirs, files in os.walk(TESTS_DIRECTORY))
        logging.debug(f"Test directory status: {TESTS_DIRECTORY}, {robot_count} .robot files")
        
        return jsonify({
            'status': 'success',
            'configured': True,
            'directory': TESTS_DIRECTORY,
            'robot_file_count': robot_count
        })
    except Exception as e:
        logging.error(f"Error getting test directory status: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)})

# --- Original Functions (unchanged except for logging) ---
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

def scan_dependencies():
    result = {
        'status': 'success',
        'installed_packages_count': 0,
        'requirements_files': [],
        'missing_packages': [],
        'missing_packages': [],
        'version_conflicts': [],
        'suggestions': [],
        'errors': []
    }
    
    try:
        installed_packages = get_installed_packages()
        result['installed_packages_count'] = len(installed_packages)
        
        project_root = os.path.dirname(os.path.abspath(TESTS_DIRECTORY)) if TESTS_DIRECTORY else SCRIPT_DIR
        requirements_files = find_requirements_files(project_root)
        requirements_files.extend(find_requirements_files(SCRIPT_DIR))
        requirements_files = list(set(requirements_files))
        result['requirements_files'] = requirements_files
        
        if not requirements_files:
            result['suggestions'].append("No requirements.txt files found")
            logging.info("No requirements.txt files found")
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
            logging.info(f"Found {len(result['missing_packages'])} missing packages")
        if result['version_conflicts']:
            result['suggestions'].append(f"Found {len(result['version_conflicts'])} version conflicts")
            logging.info(f"Found {len(result['version_conflicts'])} version conflicts")
        if not result['missing_packages'] and not result['version_conflicts']:
            result['suggestions'].append("All dependencies satisfied")
            logging.info("All dependencies satisfied")
    
    except Exception as e:
        result['status'] = 'error'
        result['errors'].append(f"Error during scan: {str(e)}")
        logging.error(f"Error during dependency scan: {str(e)}")
    
    return result

def install_missing_dependencies_thread(missing_packages):
    global state
    
    try:
        state.logs.append("Starting dependency installation...")
        logging.info("Starting dependency installation")
        
        for i, pkg_info in enumerate(missing_packages, 1):
            pkg_line = pkg_info['raw_line']
            state.logs.append(f"Installing [{i}/{len(missing_packages)}]: {pkg_line}")
            logging.debug(f"Installing [{i}/{len(missing_packages)}]: {pkg_line}")
            
            process = subprocess.Popen(
                ['pip', 'install', pkg_line],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            for line in iter(process.stdout.readline, ''):
                if line.strip():
                    state.logs.append(f"  {line.strip()}")
                    logging.debug(f"pip output: {line.strip()}")
            
            return_code = process.wait()
            
            if return_code == 0:
                state.logs.append(f"  ✓ Successfully installed: {pkg_info['name']}")
                logging.info(f"Successfully installed: {pkg_info['name']}")
            else:
                state.logs.append(f"  ✗ Failed to install: {pkg_info['name']}")
                logging.error(f"Failed to install: {pkg_info['name']}")
        
        state.logs.append("Dependency installation completed")
        logging.info("Dependency installation completed")
        state.status = 'success'
        
    except Exception as e:
        state.logs.append(f"Error during installation: {str(e)}")
        logging.error(f"Error during installation: {str(e)}")
        state.status = 'failed'
    finally:
        state.process = None

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
            preexec_fn=preexec_fn
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
            project_root = os.path.dirname(os.path.abspath(project_dir))
            video_search_dir = os.path.join(project_root, 'Execution_Videos')
            
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

# --- Main Flask Routes ---
@app.route('/list-suites', methods=['GET'])
def list_suites():
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        logging.warning("No test directory configured for /list-suites")
        return jsonify({"error": "No test directory configured. Use /discover-test-directories"}), 500

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
                            "name": relative_path.replace('\\\\', '/'),
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
    try:
        result = scan_dependencies()
        logging.debug(f"Dependency scan result: {result['status']}")
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error in scan-dependencies: {str(e)}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/install-dependencies', methods=['POST'])
def install_dependencies():
    global state
    
    if state.status == "running":
        logging.warning("Operation in progress: cannot install dependencies")
        return jsonify({"status": "error", "message": "Operation in progress"}), 409
    
    try:
        data = request.get_json()
        missing_packages = data.get('missing_packages', [])
        
        if not missing_packages:
            logging.warning("No packages to install")
            return jsonify({"status": "error", "message": "No packages to install"}), 400
        
        state.reset()
        state.status = "running"
        
        thread = Thread(target=install_missing_dependencies_thread, args=(missing_packages,))
        thread.daemon = True
        thread.start()
        
        logging.info(f"Started installing {len(missing_packages)} packages")
        return jsonify({"status": "running", "message": f"Installing {len(missing_packages)} packages..."})
        
    except Exception as e:
        state.reset()
        logging.error(f"Error installing dependencies: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/run', methods=['POST'])
def run_robot_tests():
    global state
    if not TESTS_DIRECTORY or not os.path.isdir(TESTS_DIRECTORY):
        logging.warning("No test directory configured for /run")
        return jsonify({"status": "error", "message": "No test directory configured"}), 400

    if state.status == "running":
        logging.warning("Execution already running")
        return jsonify({"status": "error", "message": "Execution already running"}), 409

    try:
        data = request.get_json()
        if not data:
            logging.warning("No data provided for /run")
            return jsonify({"status": "error", "message": "No data provided"}), 400

        state.reset()
        state.status = "running"

        runType = data.get('runType')
        config = data.get('config', {})
        
        # Handle orchestrator data
        if runType == 'Orchestrator' and 'orchestratorData' in config:
            state.orchestrator_data = config['orchestratorData']
            
            headers = state.orchestrator_data.get('headers', [])
            data_rows = state.orchestrator_data.get('data', [])
            
            # Sort by priority if available
            try:
                priority_index = next((i for i, h in enumerate(headers) if str(h).lower() == 'priority'), -1)
                
                if priority_index != -1:
                    priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
                    indexed_rows = list(enumerate(data_rows))
                    
                    indexed_rows.sort(key=lambda x: (
                        priority_order.get(str(x[1][priority_index]).upper(), 99), 
                        x[0]
                    ))
                    
                    state.orchestrator_data['data'] = [row for _, row in indexed_rows]
                    logging.debug("Sorted orchestrator data by priority")
            except Exception as e:
                state.logs.append(f"Priority sorting error: {e}")
                logging.error(f"Priority sorting error: {e}")

        tests_to_run_path = TESTS_DIRECTORY
        command = ['robot']
        timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        output_dir = os.path.abspath(os.path.join(SCRIPT_DIR, f'temp_output_{timestamp}'))
        command.extend(['--outputdir', output_dir])
        
        variable_file_to_cleanup = None

        if runType == 'By Tag':
            if config.get('includeTags'):
                command.extend(['-i', config['includeTags']])
            if config.get('excludeTags'):
                command.extend(['-e', config['excludeTags']])
        elif runType == 'By Suite' and config.get('suite'):
            suite_path = os.path.join(TESTS_DIRECTORY, config['suite'].replace('/', os.sep))
            if os.path.isfile(suite_path):
                tests_to_run_path = suite_path
            else:
                logging.warning(f"Suite not found: {suite_path}")
                return jsonify({"status": "error", "message": f"Suite not found: {suite_path}"}), 404
        elif runType == 'By Test Case' and config.get('testcase'):
            command.extend(['-t', config['testcase']])
        elif runType == 'Orchestrator':
            variable_file_to_cleanup = create_variable_file_from_data(timestamp)
            if variable_file_to_cleanup:
                command.extend(['--variablefile', variable_file_to_cleanup])

        command.append(tests_to_run_path)

        state.logs.append(f"Executing: {' '.join(command)}")
        logging.info(f"Executing robot command: {' '.join(command)}")

        thread = Thread(target=run_robot_in_thread, args=(command, output_dir, timestamp, TESTS_DIRECTORY))
        thread.daemon = True
        thread.start()
        
        # Cleanup variable file
        if variable_file_to_cleanup:
            try:
                time.sleep(2)
                os.remove(variable_file_to_cleanup)
                logging.debug(f"Cleaned up variable file: {variable_file_to_cleanup}")
            except Exception as e:
                logging.error(f"Error cleaning up variable file: {e}")

        return jsonify({"status": "running", "message": "Execution started"})

    except Exception as e:
        state.reset()
        logging.error(f"Error in run_robot_tests: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/status', methods=['GET'])
def get_status():
    logging.debug(f"Status requested: {state.status}")
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
            if state.status == "running":
                state.status = "stopped"

            if os.name == 'nt':
                state.process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                os.killpg(os.getpgid(state.process.pid), signal.SIGTERM)

            logging.info("Stop signal sent to robot process")
            return jsonify({"status": "success", "message": "Stop signal sent"})
        except Exception as e:
            logging.error(f"Error stopping robot tests: {str(e)}")
            return jsonify({"status": "error", "message": str(e)}), 500
    else:
        logging.info("No execution running to stop")
        return jsonify({"status": "info", "message": "No execution running"})

@app.route('/reports', methods=['GET'])
def list_reports():
    try:
        files = os.listdir(REPORTS_DIR)
        files.sort(key=lambda x: os.path.getmtime(os.path.join(REPORTS_DIR, x)), reverse=True)
        logging.debug(f"Listed {len(files)} reports")
        return jsonify(files)
    except Exception as e:
        logging.error(f"Error listing reports: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/download-report/<filename>', methods=['GET'])
def download_report(filename):
    try:
        clean_filename = filename.split('#')[0].split('?')[0]
        
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            logging.warning(f"Invalid filename for download: {clean_filename}")
            return jsonify({"error": "Invalid filename"}), 400
        
        actual_filename = find_matching_report_file(clean_filename, REPORTS_DIR)
        if not actual_filename or not os.path.exists(os.path.join(REPORTS_DIR, actual_filename)):
            logging.warning(f"Report file not found: {clean_filename}")
            return jsonify({"error": "File not found"}), 404
        
        logging.debug(f"Downloading report: {actual_filename}")
        return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=True)
    except Exception as e:
        logging.error(f"Error downloading report: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/stream-video/<filename>', methods=['GET'])
def stream_video(filename):
    try:
        clean_filename = filename.split('#')[0].split('?')[0]
        
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            logging.warning(f"Invalid filename for video stream: {clean_filename}")
            return jsonify({"error": "Invalid filename"}), 400
        
        actual_filename = find_matching_report_file(clean_filename, REPORTS_DIR)
        if not actual_filename:
            logging.warning(f"Video file not found: {clean_filename}")
            return jsonify({"error": "Video not found"}), 404
        
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        if not os.path.exists(file_path) or not actual_filename.lower().endswith(('.mp4', '.webm', '.avi', '.mov')):
            logging.warning(f"Invalid video file: {file_path}")
            return jsonify({"error": "Video file not found"}), 404
        
        file_size = os.path.getsize(file_path)
        range_header = request.headers.get('Range', None)
        
        if range_header:
            byte_start = byte_end = 0
            range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
            if range_match:
                byte_start = int(range_match.group(1))
                byte_end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
            
            byte_start = max(0, byte_start)
            byte_end = min(file_size - 1, byte_end)
            content_length = byte_end - byte_start + 1
            
            with open(file_path, 'rb') as video_file:
                video_file.seek(byte_start)
                data = video_file.read(content_length)
            
            response = make_response(data)
            response.status_code = 206
            response.headers['Content-Range'] = f'bytes {byte_start}-{byte_end}/{file_size}'
            response.headers['Accept-Ranges'] = 'bytes'
            response.headers['Content-Length'] = str(content_length)
        else:
            with open(file_path, 'rb') as video_file:
                data = video_file.read()
            
            response = make_response(data)
            response.headers['Content-Length'] = str(file_size)
        
        # Set video content type
        if actual_filename.lower().endswith('.mp4'):
            response.headers['Content-Type'] = 'video/mp4'
        elif actual_filename.lower().endswith('.webm'):
            response.headers['Content-Type'] = 'video/webm'
        elif actual_filename.lower().endswith('.avi'):
            response.headers['Content-Type'] = 'video/x-msvideo'
        else:
            response.headers['Content-Type'] = 'video/mp4'
        
        logging.debug(f"Streaming video: {actual_filename}")
        return response
    except Exception as e:
        logging.error(f"Error streaming video: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/reports/<filename>', methods=['GET'])
def get_report(filename):
    try:
        clean_filename = filename.split('#')[0].split('?')[0]
        
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            logging.warning(f"Invalid filename for report: {clean_filename}")
            return jsonify({"error": "Invalid filename"}), 400
        
        actual_filename = find_matching_report_file(clean_filename, REPORTS_DIR)
        if not actual_filename:
            logging.warning(f"Report file not found: {clean_filename}")
            return jsonify({"error": "File not found"}), 404
        
        file_path = os.path.join(REPORTS_DIR, actual_filename)
        
        if actual_filename.endswith('.html'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                
                # Fix internal HTML links
                if 'report-' in actual_filename:
                    timestamp_match = re.search(r'report-(\d{8}-\d{6})\.html', actual_filename)
                    if timestamp_match:
                        timestamp = timestamp_match.group(1)
                        log_filename = f"log-{timestamp}.html"
                        if os.path.exists(os.path.join(REPORTS_DIR, log_filename)):
                            html_content = html_content.replace('log.html', log_filename)
                
                elif 'log-' in actual_filename:
                    timestamp_match = re.search(r'log-(\d{8}-\d{6})\.html', actual_filename)
                    if timestamp_match:
                        timestamp = timestamp_match.group(1)
                        report_filename = f"report-{timestamp}.html"
                        if os.path.exists(os.path.join(REPORTS_DIR, report_filename)):
                            html_content = html_content.replace('report.html', report_filename)
                
                response = make_response(html_content)
                response.headers['Content-Type'] = 'text/html; charset=utf-8'
                response.headers['Cache-Control'] = 'no-cache'
                logging.debug(f"Serving HTML report: {actual_filename}")
                return response
                
            except Exception as e:
                logging.error(f"Error serving HTML report: {str(e)}")
                return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=False)
                
        elif actual_filename.endswith(('.mp4', '.webm', '.avi', '.mov')):
            logging.debug(f"Redirecting to stream video: {actual_filename}")
            return redirect(f'/stream-video/{actual_filename}')
        else:
            logging.debug(f"Serving file: {actual_filename}")
            return send_from_directory(REPORTS_DIR, actual_filename, as_attachment=False)
            
    except Exception as e:
        logging.error(f"Error serving report: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/delete-report/<filename>', methods=['DELETE'])
def delete_report(filename):
    try:
        clean_filename = filename.split('#')[0].split('?')[0]
        
        if '..' in clean_filename or '/' in clean_filename or '\\' in clean_filename:
            logging.warning(f"Invalid filename for deletion: {clean_filename}")
            return jsonify({"error": "Invalid filename"}), 400
        
        file_path = os.path.join(REPORTS_DIR, clean_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            logging.info(f"Deleted report: {clean_filename}")
            return jsonify({"success": f"Deleted {clean_filename}"})
        else:
            logging.warning(f"File not found for deletion: {clean_filename}")
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting report: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found_error(error):
    logging.error(f"404 error: {str(error)}")
    return jsonify({"error": "Resource not found"}), 404

if __name__ == '__main__':
    # Final startup message
    if not TESTS_DIRECTORY:
        print("\nWARNING: No test directory configured!")
        print("Use these endpoints to configure:")
        print("  GET  /discover-test-directories")
        print("  POST /set-test-directory")
        print("  GET  /test-directory-status")
        logging.warning("No test directory configured at startup")
    else:
        print(f"\nServer ready! Test directory: {TESTS_DIRECTORY}")
        logging.info(f"Server ready with test directory: {TESTS_DIRECTORY}")
    
    print("Starting server on http://127.0.0.1:5001")
    logging.info("Starting Flask server on http://127.0.0.1:5001")
    app.run(host='127.0.0.1', port=5001, debug=True)

    