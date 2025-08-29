
# Robot Maestro - Python Execution Backend Example

This directory contains a simple Python Flask server that acts as the execution backend for the Robot Maestro UI.

## What It Does

This server exposes a single endpoint, `/run`, which the Next.js frontend calls to trigger a test execution. It receives the test configuration (e.g., tags, suite names) and is responsible for running the Robot Framework tests.

**This is a simulation.** It does not actually run `robot` commands. Instead, it:
1.  Constructs the command it *would* have run.
2.  Prints it to the console.
3.  Waits for a few seconds to simulate an execution.
4.  Generates mock log output.
5.  Randomly returns a "success" or "failed" status.
6.  Sends the logs and status back to the Robot Maestro UI in the expected JSON format.

## How to Run It

1.  **Prerequisites**:
    *   Python 3.6+
    *   pip

2.  **Installation**:
    Navigate to this directory in your terminal and install the required library, Flask:
    ```sh
    pip install Flask
    ```

3.  **Running the Server**:
    Use the following command to start the development server:
    ```sh
    flask --app server run --port=5001
    ```
    Alternatively, you can run the Python script directly:
     ```sh
    python server.py
    ```

    The server will now be running and listening for requests on `http://localhost:5001`. The Robot Maestro UI is already configured to send requests to this address.

## Making It Real

To adapt this for a real-world scenario, you would need to modify `server.py` to:
-   Accept a `.zip` file containing the Robot Framework project.
-   Unzip the project into a temporary directory.
-   Use Python's `subprocess` module to execute the actual `robot` command-line tool with the received parameters.
-   Capture the standard output and standard error from the subprocess.
-   Return the real logs and the actual exit code (`success` or `failed`) to the UI.
