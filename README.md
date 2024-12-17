# Snowflake Cortex Demo App

A no-code environment powered by Streamlit for interacting with Snowflake Cortex functionalities. This application allows users to seamlessly integrate and utilize Snowflake's powerful data processing capabilities through an intuitive web interface.

## Features

The application provides several key features:

### Playground
An interactive environment where users can experiment with Snowflake Cortex functions, test prompts, and and play around with cortex functions.

### Build
A dedicated section for constructing and deploying data pipelines and workflows using Snowflake Cortex's powerful AI capabilities, enabling seamless integration with your Snowflake databases and tables
- Text completion and generation using the COMPLETE function
- Retrieval-Augmented Generation (RAG) for question answering with your own data
- Fine-tuning large language models on your custom datasets


### Notification
A notification system that keeps users informed about task completions, error messages as logs ensuring smooth operation monitoring.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Snowflake Account**: An active Snowflake account with Cortex functionalities enabled.
- **Role Permissions**: ACCOUNTADMIN or equivalent role with permissions to create:
  - Stages
  - Databases
  - Other resources
- **Python**: Version 3.7 or higher.
- **Streamlit**: Installed on your local machine.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sgsshankar/Snowflake-AI-Toolkit.git
   cd snowflake-cortex-demo
   ```

2. Install dependencies (only required for local development):
   ```bash
   pip install -r requirements.txt
   ```

   All necessary libraries are listed in `requirements.txt`.

## Setup

The application will automatically handle:
- Database creation
- Stage setup
- Required resource initialization

Make sure your Snowflake role has the necessary privileges for these operations.

To configure the application mode, update the `mode` parameter in `src/settings_config.json`:
- Set to `"debug"` for local development and editing.
- Set to `"native"` for running natively in Snowflake.

## Running the App

### Locally

Launch the application locally using:
   ```bash
   streamlit run streamlit_app.py
   ```

The app will open in your default browser with the following features:
- Playground
- Build
- Notifications

### On Snowflake

To deploy the application natively in Snowflake, use the following command:
   ```bash
   snow streamlit deploy --account "<your_account>" --user "<your_username>" --password "<your_password>" --role "<your_role>" --warehouse "<your_warehouse>" --database "<your_database>" --replace
   ```

Replace the placeholders (`<your_account>`, `<your_username>`, etc.) with your actual Snowflake account details. When running natively in Snowflake, installing dependencies from `requirements.txt` is not needed.

## Project Structure

| File/Directory                      | Description                                      |
|-------------------------------------|--------------------------------------------------|
| [src/](src/)                        | Source code for setup and styling                |
| [src/setup.py](src/setup.py)        | Setup and initialization code                    |
| [src/styles.css](src/styles.css)    | Custom styling                                   |
| [src/build.py](src/build.py)        | Build mode functionality                         |
| [src/cortex_functions.py](src/cortex_functions.py) | Core functions for Cortex operations      |
| [src/query_result_builder.py](src/query_result_builder.py) | Query result handling and display      |
| [src/playground.py](src/playground.py) | Playground mode functionality                  |
| [src/rag.py](src/rag.py) | RAG mode functionality                  |
| [src/fine_tune.py](src/fine_tune.py) | Fine-tuning functionality                  |
| [.gitignore](.gitignore)            | Git ignore file                                  |
| [requirements.txt](requirements.txt)| Project dependencies                             |
| [streamlit_app.py](streamlit_app.py)| Main application entry point                     |

## Configuration

### Snowflake Connection Parameters

To configure the Snowflake connection parameters for running the application locally, you need to edit the `src/settings_config.json` file. This file contains the necessary connection details such as account, user, password, role, warehouse, database, and schema.

Here is an example configuration:


## Troubleshooting

Common issues and solutions:

1. **Snowflake Permission Errors**
   - Verify role privileges for database and stage creation
   - Ensure Cortex functionalities are enabled

2. **Dependency Issues**
   - If pandas/pyarrow installation fails:
     ```bash
     pip install pandas pyarrow
     ```

3. **Connection Issues**
   - Verify Snowflake account credentials
   - Check network connectivity
   - Ensure proper role assignments

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Support

For assistance:
- Open an issue in the GitHub repository
- Contact project maintainers
- Check documentation for common solutions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Snowflake for Cortex platform
- Streamlit for the web interface framework
- All contributors and maintainers