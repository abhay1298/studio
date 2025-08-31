
from flask import Flask, request, jsonify, make_response, send_from_directory
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
from threading import Thread
from collections import deque

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Configuration ---
# Get the absolute path of the directory where this script is located.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# IMPORTANT: You MUST change this path to the ABSOLUTE path of your Robot Framework project folder.
# This is the directory that contains your .robot files.
# Example for Windows: TESTS_DIRECTORY = 'C:/Users/YourUser/Documents/RobotMaestro/tests'
# Example for macOS/Linux: TESTS_DIRECTORY = '/Users/YourUser/Documents/RobotMaestro/tests'
TESTS_DIRECTORY = os.path.join(SCRIPT_DIR, '..', '..', 'tests_example') # A default example path

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


def run_robot_in_thread(command, output_dir, timestamp):
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

        # Read stdout line by line in a non-blocking way
        for line in iter(state.process.stdout.readline, ''):
            clean_line = line.strip()
            if not clean_line:
                continue
            state.logs.append(clean_line)

            # --- Accurate Pass/Fail Counting ---
            # A test case line doesn't start with '---' or '==='
            if not clean_line.startswith(('---', '===')):
                if clean_line.endswith('| PASS |'):
                    state.pass_count += 1
                elif clean_line.endswith('| FAIL |'):
                    state.fail_count += 1

        state.process.stdout.close()
        state.return_code = state.process.wait()

        if state.status != "running":
            state.logs.append(f"\nExecution was manually stopped.")
            return # Exit early if the process was stopped

        # --- Post Execution Processing ---
        try:
            if os.path.exists(output_dir):
                for dirpath, _, filenames in os.walk(output_dir):
                    for f in filenames:
                        temp_file_path = os.path.join(dirpath, f)

                        if f.lower() == 'report.html' and not state.report_file:
                            state.report_file = f"report-{timestamp}.html"
                            shutil.move(temp_file_path, os.path.join(REPORTS_DIR, state.report_file))
                            state.logs.append(f"\nSuccessfully archived report to {state.report_file}")

                        elif f.lower() == 'log.html' and not state.log_file:
                            state.log_file = f"log-{timestamp}.html"
                            shutil.move(temp_file_path, os.path.join(REPORTS_DIR, state.log_file))
                            state.logs.append(f"Successfully archived log to {state.log_file}")

                        elif f.lower().endswith(('.mp4', '.webm', '.avi')) and not state.video_file:
                            video_ext = os.path.splitext(f)[1]
                            state.video_file = f"video-{timestamp}{video_ext}"
                            shutil.move(temp_file_path, os.path.join(REPORTS_DIR, state.video_file))
                            state.logs.append(f"Successfully archived video to {state.video_file}")

        except Exception as e:
            state.logs.append(f"\nError during report archiving: {e}")

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

        tests_directory_to_run = TESTS_DIRECTORY

        # --- Command Construction (Real) ---
        command = ['robot']
        timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        # Use an absolute path for the temporary output directory
        output_dir = os.path.join(SCRIPT_DIR, f'temp_output_{timestamp}')

        command.extend(['--outputdir', output_dir])

        if runType == 'By Tag':
            if config.get('includeTags'):
                command.extend(['-i', config['includeTags']])
            if config.get('excludeTags'):
                command.extend(['-e', config['excludeTags']])
        elif runType == 'By Suite' and config.get('suite'):
            # When running by suite, we need to construct the full path to the suite file
            suite_path = os.path.join(TESTS_DIRECTORY, config['suite'].replace('/', os.sep))
            tests_directory_to_run = suite_path # We run this specific file
        elif runType == 'By Test Case' and config.get('testcase'):
            command.extend(['-t', config['testcase']])

        command.append(tests_directory_to_run)

        state.logs.append("==============================================================================")
        state.logs.append(f"Executing command: {' '.join(command)}")
        state.logs.append("==============================================================================")

        # --- Start non-blocking execution in a separate thread ---
        thread = Thread(target=run_robot_in_thread, args=(command, output_dir, timestamp))
        thread.daemon = True
        thread.start()

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

            # Don't wait here, let the thread handle the process cleanup
            state.logs.append("--- Stop signal sent to process ---")
            return jsonify({"status": "success", "message": "Stop signal sent."}), 200
        except Exception as e:
            print(f"Error stopping process: {e}")
            state.logs.append(f"--- Error stopping process: {e} ---")
            state.status = "failed"
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

@app.route('/reports/<filename>', methods=['GET'])
def get_report(filename):
    try:
        # Serve the file from the absolute path of REPORTS_DIR
        return send_from_directory(REPORTS_DIR, filename, as_attachment=False)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/delete-report/<filename>', methods=['DELETE'])
def delete_report(filename):
    try:
        file_path = os.path.join(REPORTS_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"success": f"Deleted {filename}"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)

    

    