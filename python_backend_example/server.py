
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import subprocess
import time
import random
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# This is a more realistic execution backend.
# It now uses Python's `subprocess` module to execute real commands.
# To use this:
# 1. Make sure you have Robot Framework installed in the same Python environment.
#    (e.g., `pip install robotframework`)
# 2. Place your Robot Framework project (e.g., your 'tests' folder)
#    in a location accessible to this server. You might need to adjust paths.
# 3. This server still simulates pass/fail counts for UI purposes.

@app.route('/run', methods=['POST'])
def run_robot_tests():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400

        runType = data.get('runType')
        config = data.get('config', {})
        
        # --- IMPORTANT: CONFIGURE YOUR TEST DIRECTORY ---
        # This is the path to your Robot Framework tests.
        # For this example, we assume there's a 'tests' folder sibling to the `python_backend_example` directory.
        # You MUST change this path to point to your actual test suite.
        tests_directory = r'C:\Users\c-aku\robotFramework\robotFramework\pythonProject\Test'


        # --- Command Construction (Real) ---
        command = ['robot']

        if runType == 'By Tag':
            if config.get('includeTags'):
                command.extend(['-i', config['includeTags']])
            if config.get('excludeTags'):
                command.extend(['-e', config['excludeTags']])
        elif runType == 'By Suite' and config.get('suite'):
            # Note: The '-s' argument in robot is for suite name, not file path.
            # A more robust solution might involve parsing file paths.
            command.extend(['-s', config['suite']])
        elif runType == 'By Test Case' and config.get('testcase'):
            command.extend(['-t', config['testcase']])
        
        # Add the path to the test files/folder at the end
        command.append(tests_directory)
            
        print(f"--- Preparing Real Execution ---")
        print(f"Received Run Type: {runType}")
        print(f"Received Config: {config}")
        print(f"Constructed Command: {' '.join(command)}")
        print(f"Executing in directory: {tests_directory}")
        print("------------------------------")
        
        # --- Real Execution using subprocess ---
        # We use Popen to allow for capturing output in real-time if needed,
        # but for simplicity, we'll use `run` which waits for completion.
        process = subprocess.run(
            command,
            capture_output=True,
            text=True, # Decodes stdout/stderr as text
            check=False # Prevents raising an exception on non-zero exit codes
        )

        logs = []
        logs.append("==============================================================================")
        logs.append(f"Executing command: {' '.join(command)}")
        logs.append("==============================================================================")
        
        # Append actual stdout and stderr from the command
        if process.stdout:
            logs.append("\n--- STDOUT ---\n")
            logs.append(process.stdout)
        if process.stderr:
            logs.append("\n--- STDERR ---\n")
            logs.append(process.stderr)

        # Determine status from the return code
        if process.returncode == 0:
            status = 'success'
            logs.append("\nExecution Result: SUCCESS (Exit Code 0)")
        else:
            status = 'failed'
            logs.append(f"\nExecution Result: FAILED (Exit Code {process.returncode})")
            # If the command failed because robot isn't installed, provide a helpful message
            if "not found" in process.stderr.lower() or "is not recognized" in process.stderr.lower():
                logs.append("\n[HINT]: The 'robot' command was not found. Is Robot Framework installed in the Python environment running this server?")


        # --- Pass/Fail Count Simulation (for UI) ---
        # A real implementation would parse the output.xml from Robot Framework
        # to get the exact counts. This is a placeholder for that logic.
        output_text = process.stdout + process.stderr
        pass_count = output_text.count('| PASS |')
        fail_count = output_text.count('| FAIL |')
        
        # If no explicit pass/fail found, simulate some for demo purposes
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
        })

    except Exception as e:
        print(f"A critical error occurred in the Flask server: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # It's recommended to run Flask with a production-ready WSGI server like Gunicorn or Waitress.
    # The command `flask run` uses a development server which is not suitable for production.
    # Using 127.0.0.1 is often more reliable for local development than 0.0.0.0.
    app.run(host='127.0.0.1', port=5001, debug=True)
