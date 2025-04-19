# Setting up Creature Crafter in Firebase Studio (Without Docker)

This guide explains how to set up and run the Creature Crafter project in Firebase Studio without using Docker.

## Prerequisites

*   Firebase Studio access.
*   Basic familiarity with the command line.
*  Basic knowledge of the project.

## Setup Steps

### 1. XRPL Node (rippled)

1.  **Configuration:**
    *   The XRPL node (rippled) will use the `xrpl-config/rippled-firebase.cfg` configuration file.
    *   This file is pre-configured for a standalone local network.
    *   The default database location is set to `/app/.xrpl_db`.
    * The log file will be at /app/.xrpl_log.txt
    *   **Important:** Do not modify `xrpl-config/rippled.cfg`, as this is used for local development with docker.

2.  **Starting rippled:**
    *   rippled is started using the  `start-firebase.sh` script.
    * The script will check if the database path exists and create it if not.
    * It will also check for the log file.
    *   The script will start rippled using the defined config.

3.  **Stopping rippled:**
    *  To stop rippled you have to use the `stop-firebase.sh` script.
    * The script will look for any rippled process and kill it.

### 2. Backend

1.  **Starting the Backend:**
    *   The backend is started by the `start-firebase.sh` script.
    *   It uses the `make run` command to start the matchmaker and oracle.

2. **Stopping the backend**
    *  The backend can be stopped using the `stop-firebase.sh` script.
    * The script will look for any process started with `make run` and kill it.

### 3. Frontend

1.  **Starting the Frontend:**
    *   The frontend is started by the `start-firebase.sh` script.
    *   It changes the current directory to `frontend`.
    *   It starts the development server using `npm run dev`.

2. **Stopping the frontend**
    *  The frontend can be stopped using the `stop-firebase.sh` script.
    * The script will look for any process started with `npm run dev` and kill it.

### 4. Starting Everything

1.  **Run `start-firebase.sh`:**
    *   Open a terminal in Firebase Studio.
    *   Navigate to the root directory of the project.
    *   Execute the following command: `bash start-firebase.sh`
    *   This script will:
        *   Start `rippled` using `xrpl-config/rippled-firebase.cfg`.
        *   Start the backend using `make run`.
        *   Start the frontend using `npm run dev`.

### 5. Stopping Everything

1.  **Run `stop-firebase.sh`:**
    *   Open a terminal in Firebase Studio.
    *   Navigate to the root directory of the project.
    *   Execute the following command: `bash stop-firebase.sh`
    *  This will stop everything and kill all processes.

### 6. Running Tests

1.  **Run `run-firebase-tests.sh`:**
    *   Open a terminal in Firebase Studio.
    *   Navigate to the root directory of the project.
    *   Execute the following command: `bash run-firebase-tests.sh`
    *   This script will change the current directory to `tests`.
    *   It will run all tests using `npm test`.

## Notes

*   **Error Handling:** If any of the start-up commands fail, the relevant script may exit. Check the terminal output for error messages.
*  **Dependencies**: Ensure that the rippled binary is available and the dependecies of the backend and frontend are available.
* **`rippled-firebase.cfg`**: Ensure that the `validation_seed` is set, if it is not, copy the one from `rippled.cfg`.
*   **Logs:** Check the logs to ensure that everything is running.
* **Ports**: The scripts assume that the required ports will be available.

## Troubleshooting

* If something is not working, ensure that the dependencies are installed.
* If you encounter issues, carefully review the terminal output for error messages.
* Ensure that the `validation_seed` is set, if it is not, copy the one from `rippled.cfg`.
* Ensure that the required ports are open.
* Check the logs in `/app/.xrpl_log.txt`.