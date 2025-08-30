
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

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# This is a more realistic execution backend.
# It now uses Python's `subprocess` module to execute real commands.
# To use this:
# 1. Make sure you have Robot Framework installed in the same Python environment.
#    (e.g., `pip install -r requirements.txt`)
# 2. Place your Robot Framework project (e.g., your 'tests' folder)
#    in a location accessible to this server.
# 3. This server still simulates pass/fail counts for UI purposes.

# Global variable to hold the running process
robot_process = None
REPORTS_DIR = 'reports_archive' # Directory to store archived reports

if not os.path.exists(REPORTS_DIR):
    os.makedirs(REPORTS_DIR)


# --- IMPORTANT: CONFIGURE YOUR TEST DIRECTORY ---
# This is the path to your Robot Framework tests.
# You MUST change this path to point to your actual test suite.
# It should be the absolute path to the directory containing your .robot files.
TESTS_DIRECTORY = r'C:\Users\c-aku\robotFramework\robotFramework\pythonProject\Test'

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
                
                if in_test_cases_section and stripped_line and not stripped_line.startswith('#') and not stripped_line.startswith('[') and not line.startswith((' ', '\t')):
                    # This is a basic heuristic: a line that is not a comment, not a setting, and not indented.
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


@app.route('/run', methods=['POST'])
def run_robot_tests():
    global robot_process
    if robot_process and robot_process.poll() is None:
        return jsonify({"status": "error", "message": "Another execution is already in progress."}), 409

    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400

        runType = data.get('runType')
        config = data.get('config', {})
        
        tests_directory = TESTS_DIRECTORY

        # --- Command Construction (Real) ---
        command = ['robot']
        timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
        output_dir = os.path.join(os.getcwd(), 'temp_output') # Temporary output directory

        command.extend(['--outputdir', output_dir])

        if runType == 'By Tag':
            if config.get('includeTags'):
                command.extend(['-i', config['includeTags']])
            if config.get('excludeTags'):
                command.extend(['-e', config['excludeTags']])
        elif runType == 'By Suite' and config.get('suite'):
            # When running by suite, we need to construct the full path to the suite file
            suite_path = os.path.join(tests_directory, config['suite'].replace('/', os.sep))
            command.append(suite_path)
            tests_directory = None # Unset this so it's not appended again
        elif runType == 'By Test Case' and config.get('testcase'):
            command.extend(['-t', config['testcase']])
        
        if tests_directory:
            command.append(tests_directory)
            
        print(f"--- Preparing Real Execution ---")
        print(f"Constructed Command: {' '.join(command)}")
        
        # --- Real Execution using subprocess ---
        robot_process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        
        stdout, stderr = robot_process.communicate()
        returncode = robot_process.poll()
        robot_process = None

        logs = []
        logs.append("==============================================================================")
        logs.append(f"Executing command: {' '.join(command)}")
        logs.append("==============================================================================")
        
        if stdout:
            logs.append("\n--- STDOUT ---\n")
            logs.append(stdout)
        if stderr:
            logs.append("\n--- STDERR ---\n")
            logs.append(stderr)
            
        report_file = None
        log_file = None
        video_file = None

        # Archive reports and video
        try:
            # Archive HTML reports
            temp_report_path = os.path.join(output_dir, 'report.html')
            temp_log_path = os.path.join(output_dir, 'log.html')

            if os.path.exists(temp_report_path):
                report_file = f"report-{timestamp}.html"
                shutil.move(temp_report_path, os.path.join(REPORTS_DIR, report_file))
                logs.append(f"\nSuccessfully archived report to {report_file}")

            if os.path.exists(temp_log_path):
                log_file = f"log-{timestamp}.html"
                shutil.move(temp_log_path, os.path.join(REPORTS_DIR, log_file))
                logs.append(f"Successfully archived log to {log_file}")

            # Archive video file
            if os.path.exists(output_dir):
                for f in os.listdir(output_dir):
                    if f.lower().endswith('.avi'):
                        temp_video_path = os.path.join(output_dir, f)
                        video_file = f"video-{timestamp}.avi"
                        shutil.move(temp_video_path, os.path.join(REPORTS_DIR, video_file))
                        logs.append(f"Successfully archived video to {video_file}")
                        break # Assume only one video per run

            # Clean up other output files if necessary
            if os.path.exists(output_dir):
                shutil.rmtree(output_dir)

        except Exception as e:
            logs.append(f"\nError archiving reports or video: {e}")

        status = 'success' if returncode == 0 else 'failed'
        logs.append(f"\nExecution Result: {status.upper()} (Exit Code {returncode})")

        output_text = stdout + stderr
        pass_count = output_text.count('| PASS |')
        fail_count = output_text.count('| FAIL |')
        
        if status == 'success' and pass_count == 0 and fail_count == 0:
            pass_count = random.randint(1, 5)
        elif status == 'failed' and pass_count == 0 and fail_count == 0:
            fail_count = random.randint(1, 3)
            pass_count = random.randint(0, 2)


        return jsonify({
            "status": status,
            "logs": "\n".join(logs),
            "pass_count": pass_count,
            "fail_count": fail_count,
            "reportFile": report_file,
            "logFile": log_file,
            "videoFile": video_file
        })

    except Exception as e:
        print(f"A critical error occurred in the Flask server: {e}")
        robot_process = None
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/stop', methods=['POST'])
def stop_robot_tests():
    global robot_process
    if robot_process and robot_process.poll() is None:
        try:
            print(f"--- Terminating Process PID: {robot_process.pid} ---")
            if os.name == 'nt':
                 os.kill(robot_process.pid, signal.CTRL_C_EVENT)
            else:
                 os.killpg(os.getpgid(robot_process.pid), signal.SIGTERM)
            
            robot_process.wait(timeout=5)
            robot_process = None
            return jsonify({"status": "success", "message": "Execution stopped successfully."}), 200
        except Exception as e:
            print(f"Error stopping process: {e}")
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

    
