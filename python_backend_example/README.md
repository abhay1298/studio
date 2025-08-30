
# Robot Maestro - Python Execution Backend

This directory contains a Python Flask server that acts as the **real execution backend** for the Robot Maestro UI.

## What It Does

This server exposes a single endpoint, `/run`, which the Next.js frontend calls to trigger a test execution. It receives the test configuration (e.g., tags, suite names), constructs the appropriate `robot` command, executes it using Python's `subprocess` module, and returns the real logs and status to the UI.

## How to Run It

1.  **Prerequisites**:
    *   Python 3.6+
    *   pip

2.  **Installation**:
    Navigate to this directory in your terminal and install the required libraries from the `requirements.txt` file:
    ```sh
    pip install -r requirements.txt
    ```

3.  **Configuration**:
    *   Open the `server.py` file in a text editor.
    *   Find the line `tests_directory = ...`.
    *   **You must change this path** to the absolute path of your Robot Framework project folder (the folder containing your `.robot` files).

4.  **Running the Server**:
    Use the following command to start the development server:
    ```sh
    flask --app server run --port=5001
    ```
    Alternatively, you can run the Python script directly:
     ```sh
    python server.py
    ```

    The server will now be running and listening for requests on `http://localhost:5001`. The Robot Maestro UI is already configured to send requests to this address.

## How It Works

1.  The Flask server receives a POST request on `/run`.
2.  It parses the JSON payload to get the `runType` (e.g., 'By Tag') and the `config` (e.g., `{ "includeTags": "smoke" }`).
3.  It constructs a command list, starting with `['robot']` and adding arguments like `-i smoke`.
4.  It appends the `tests_directory` path you configured.
5.  It uses `subprocess.run()` to execute the complete command (e.g., `robot -i smoke /path/to/your/tests`).
6.  It captures the `stdout` and `stderr` from the process, which are the real logs from Robot Framework.
7.  It checks the process's `returncode`. If it's `0`, the run is marked as `success`; otherwise, it's `failed`.
8.  It returns the status and logs to the Robot Maestro UI in the expected JSON format.
