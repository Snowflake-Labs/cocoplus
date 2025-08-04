import streamlit as st
from src.utils import *
from snowflake.snowpark.exceptions import SnowparkSQLException
import json
import pandas as pd
from src.notification import *

config_path = Path("src/settings_config.json")
with open(config_path, "r") as f:
    config = json.load(f)


def format_and_display_result(result, question):
    """
    Formats and displays the completion result in Streamlit.
    
    Args:
        result (str): JSON string containing the completion result
        question (str): The original question/prompt that was asked
        
    Raises:
        Exception: If result formatting or display fails
    """
    try:
        # Parse the result JSON
        result_json = json.loads(result)
        print(result_json)
        messages = result_json.get("choices", [{}])[0].get("messages", "No messages found")
        model_used = result_json.get("model", "No model specified")
        usage = result_json.get("usage", {})

        # Display the formatted output
        st.write("Completion Result")
        st.write(f"**Model Used:** {model_used}")
        st.write(f"**Question Asked:** {question}")
        st.write("**Usage:**")
        st.write(f"  - Completion Tokens: {usage.get('completion_tokens', 'N/A')}")
        st.write(f"  - Prompt Tokens: {usage.get('prompt_tokens', 'N/A')}")
        st.write(f"  - Total Tokens: {usage.get('total_tokens', 'N/A')}")
        st.success(messages)
    except Exception as e:
        st.error(f"Failed to format and display result: {e}")
        raise e


def execute_query_and_get_result(session, prompt, model, functionality):
    """
    Executes a Snowflake query to get completion results.
    
    Args:
        session: Snowflake session object
        prompt (str): The prompt to send to the model
        model (str): The model name to use
        functionality (str): The type of operation being performed
        
    Returns:
        str: The completion result from the model
        
    Raises:
        Exception: If query execution fails
    """
    try:
        query = f"""
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            '{model}',
            [
                {{
                    'role': 'user',
                    'content': '{prompt}'
                }}
            ],
            {{
				'temperature': '{config["default_settings"]["temperature"]}',
				'max_tokens': '{config["default_settings"]["max_tokens"]}'
            }}
        );
        """
        query = query.encode("ascii", "ignore").decode()
        print("query: ",query)
        
        from src.notification import execute_cortex_with_logging
        
        result, notification_id = execute_cortex_with_logging(
            session=session,
            cortex_query=query,
            function_name="COMPLETE",
            model_name=model,
            input_text=prompt,
            details=f"Query result builder - {functionality}"
        )
        return result
    except Exception as e:
        # Log the error in the logs table
        add_log_entry(session, functionality, str(e))
        # Raise the exception to be handled by the calling function
        raise e
    

def execute_fine_tune_query(session, db, schema, train_table, validation_table, base_model, new_model_name):
    """
    Executes a query to start fine-tuning a model.
    
    Args:
        session: Snowflake session object
        db (str): Database name
        schema (str): Schema name
        train_table (str): Training data table name
        validation_table (str): Validation data table name
        base_model (str): Base model to fine-tune
        new_model_name (str): Name for the fine-tuned model
        
    Returns:
        str: Tracking ID for the fine-tuning job
        
    Raises:
        RuntimeError: If fine-tune query execution fails
    """
    query = f"""
    SELECT SNOWFLAKE.CORTEX.FINETUNE(
        'CREATE',
        '{new_model_name}',
        '{base_model}',
        'SELECT PROMPT, COMPLETION FROM {db}.{schema}.{train_table}',
        'SELECT PROMPT, COMPLETION FROM {db}.{schema}.{validation_table}'
    )
    """
    try:
        from src.notification import log_cortex_usage
        from datetime import datetime
        
        start_time = datetime.now()
        result = session.sql(query).collect()
        end_time = datetime.now()
        
        # Log the fine-tuning operation
        log_cortex_usage(
            session=session,
            function_name="FINETUNE",
            model_name=base_model,
            start_time=start_time,
            end_time=end_time,
            total_tokens=1000,  # Rough estimate for fine-tuning setup
            estimated_credits=0.1,
            details=f"Fine-tune model creation: {new_model_name} from {base_model}"
        )
        
        return result[0][0] if result else None
    except Exception as e:
        raise RuntimeError(f"Failed to execute fine-tune query: {e}")


def execute_fine_tune_status_query(session, tracking_id):
    """
    Fetches the status of a fine-tuning job.
    
    Args:
        session: Snowflake session object
        tracking_id (str): ID of the fine-tuning job
        
    Returns:
        str: JSON string containing status information
        
    Raises:
        RuntimeError: If status query fails
    """
    query = f"""
    SELECT SNOWFLAKE.CORTEX.FINETUNE(
        'DESCRIBE',
        '{tracking_id}'
    )
    """
    try:
        from src.notification import log_cortex_usage
        from datetime import datetime
        
        start_time = datetime.now()
        result = session.sql(query).collect()
        end_time = datetime.now()
        
        # Log the fine-tuning status check
        log_cortex_usage(
            session=session,
            function_name="FINETUNE",
            start_time=start_time,
            end_time=end_time,
            total_tokens=10,  # Minimal tokens for status check
            estimated_credits=0.001,
            details=f"Fine-tune status check for tracking ID: {tracking_id}"
        )
        
        return result[0][0] if result else None
    except Exception as e:
        raise RuntimeError(f"Failed to fetch fine-tune status: {e}")


def fetch_fine_tuned_models(session):
    """
    Retrieves a list of all fine-tuned models.
    
    Args:
        session: Snowflake session object
        
    Returns:
        list: Names of available fine-tuned models
        
    Raises:
        RuntimeError: If model fetching fails
    """
    query = "SHOW MODELS"
    try:
        models = session.sql(query).collect()
        fine_tuned_models = [
            model["name"]
            for model in models
            if "CORTEX_FINETUNED" in model["model_type"]
        ]
        return fine_tuned_models
    except Exception as e:
        raise RuntimeError(f"Failed to fetch fine-tuned models: {e}")


def execute_fine_tune_status_query(session, tracking_id):
    """
    Fetches detailed status information for a fine-tuning job.
    
    Args:
        session: Snowflake session object
        tracking_id (str): ID of the fine-tuning job
        
    Returns:
        str: JSON string containing detailed status information
        
    Raises:
        RuntimeError: If status query fails
    """
    query = f"""
    SELECT SNOWFLAKE.CORTEX.FINETUNE(
        'DESCRIBE',
        '{tracking_id}'
    )
    """
    try:
        from src.notification import log_cortex_usage
        from datetime import datetime
        
        start_time = datetime.now()
        result = session.sql(query).collect()
        end_time = datetime.now()
        
        # Log the detailed fine-tuning status check
        log_cortex_usage(
            session=session,
            function_name="FINETUNE",
            start_time=start_time,
            end_time=end_time,
            total_tokens=10,  # Minimal tokens for status check
            estimated_credits=0.001,
            details=f"Detailed fine-tune status check for tracking ID: {tracking_id}"
        )
        
        return result[0][0] if result else None
    except Exception as e:
        raise RuntimeError(f"Failed to fetch fine-tune status for Tracking ID {tracking_id}: {e}")

def format_fine_tune_status_result(status_json):
    """
    Formats the fine-tune status JSON into a pandas DataFrame.
    
    Args:
        status_json (str): JSON string containing fine-tune status
        
    Returns:
        pandas.DataFrame: Formatted status information
        
    Raises:
        ValueError: If JSON parsing fails
    """
    try:
        status_data = json.loads(status_json)

        # Prepare table-friendly data
        table_data = {
            "Base Model": [status_data.get("base_model", "N/A")],
            "Created On": [status_data.get("created_on", "N/A")],
            "Finished On": [status_data.get("finished_on", "N/A")],
            "Model": [status_data.get("model", "N/A")],
            "Progress": [f"{status_data.get('progress', 0) * 100:.2f}%"],
            "Status": [status_data.get("status", "N/A")],
            "Training Data": [status_data.get("training_data", "N/A")],
            "Validation Data": [status_data.get("validation_data", "N/A")],
            "Trained Tokens": [status_data.get("trained_tokens", "N/A")],
            "Validation Loss": [status_data.get("training_result", {}).get("validation_loss", "N/A")],
            "Training Loss": [status_data.get("training_result", {}).get("training_loss", "N/A")],
        }

        return pd.DataFrame(table_data)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse the fine-tune status JSON: {e}")
