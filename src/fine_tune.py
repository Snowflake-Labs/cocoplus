import streamlit as st
from src.utils import *
from src.query_result_builder import *
import json
import pandas as pd
from pathlib import Path

# Load the config file
config_path = Path("src/settings_config.json")
with open(config_path, "r") as f:
    config = json.load(f)

def display_fine_tune(session):
    """
    Display the fine-tuning interface in Streamlit for training and using fine-tuned LLM models.
    
    This function creates a Streamlit interface with two main functionalities:
    1. Fine-tuning a new model using training and validation data from Snowflake tables
    2. Using an existing fine-tuned model to generate responses
    
    Args:
        session: Snowflake session object used for database operations
        
    The function handles:
    - Database and schema selection
    - Training and validation table selection
    - Model selection and naming
    - Fine-tuning process initiation
    - Status checking for ongoing fine-tuning jobs
    - Testing fine-tuned models with custom prompts
    """
    st.title("Fine-Tune LLM Model")

    # Dropdown to select action: Fine-Tune New Model or Use Fine-Tuned Model
    fine_tune_action = st.selectbox("Select Action", ["Fine-Tune A Model", "Check Status"], key="fine_tune_action")

    if fine_tune_action == "Fine-Tune A Model":
        st.subheader("Fine-Tune a New Model")

        # Database and Schema selection side by side
        col1, col2 = st.columns(2)
        with col1:
            databases = list_databases(session)
            selected_db = st.selectbox("Database", databases)

        with col2:
            schemas = list_schemas(session, selected_db)
            selected_schema = st.selectbox("Schema", schemas)

        # Train Table and Validation Table selection side by side
        col1, col2 = st.columns(2)
        with col1:
            train_tables = list_tables(session, selected_db, selected_schema)
            selected_train_table = st.selectbox("Train Table", train_tables if train_tables else ["No tables available"])

        with col2:
            validation_tables = list_tables(session, selected_db, selected_schema)
            selected_validation_table = st.selectbox("Validation Table", validation_tables if validation_tables else ["No tables available"])

        # Validate required columns in Train and Validation Tables
        fine_tune_enabled = True
        if selected_train_table != "No tables available":
            missing_columns = validate_table_columns(session, selected_db, selected_schema, selected_train_table, ["PROMPT", "COMPLETION"])
            if missing_columns:
                st.warning(f"The Train Table '{selected_train_table}' is missing required columns: {', '.join(missing_columns)}.")
                fine_tune_enabled = False

        if selected_validation_table != "No tables available":
            missing_columns = validate_table_columns(session, selected_db, selected_schema, selected_validation_table, ["PROMPT", "COMPLETION"])
            if missing_columns:
                st.warning(f"The Validation Table '{selected_validation_table}' is missing required columns: {', '.join(missing_columns)}.")
                fine_tune_enabled = False

        # Model selection and text input for generating a new model
        selected_model = st.selectbox("Base Model", config["default_settings"]["fine_tune_models"])
        new_model_name = st.text_input("New Model Name (Note: Use only _ for word spacing.)", placeholder="Type model name...")

        # Fine-Tune a New Model
        if st.button("Run", key="fine_tune_button", disabled=not fine_tune_enabled):
            details = f"Fine-tuning model `{new_model_name}` using `{selected_model}`"
            notification_id = add_notification_entry(session, "Fine-Tune Model", "In-Progress", details)
            try:
                tracking_id = execute_fine_tune_query(session,
                    selected_db,
                    selected_schema,
                    selected_train_table,
                    selected_validation_table,
                    selected_model,
                    new_model_name
                )
                if tracking_id:
                    update_notification_entry(session, notification_id, "Success")
                    details = f"Fine-tuning model `{new_model_name}` using `{selected_model}` with tracking ID `{tracking_id}`"
                    update_notification_fine_tune_entry(session, notification_id, details)
                    st.success(f"Fine-tuning started for model `{new_model_name}`! Tracking ID: `{tracking_id}`.")
                    st.info("You can use the tracking ID to check the fine-tuning progress.")
                else:
                    raise ValueError("Failed to retrieve the tracking ID.")
            except Exception as e:
                update_notification_entry(session, notification_id, "Failed")
                add_log_entry(session, "Fine-Tune Model", str(e))
                st.error(f"Failed to fine-tune the model: {e}")

    elif fine_tune_action == "Try Fine-Tuned Model":
        st.subheader("Try Fine-Tuned Model")

        # Fetch fine-tuned models
        try:
            fine_tuned_models = fetch_fine_tuned_models(session)
            if not fine_tuned_models:
                st.warning("No fine-tuned models found.")
            else:
                selected_model = st.selectbox("Model", fine_tuned_models)
                print("selected_mode",selected_model)
            # Prompt input and generation logic
            prompt = st.text_area("Enter your prompt:", placeholder="Type your prompt here...")
            if st.button("Generate", key="use_fine_tuned_model_button"):
                result = execute_query_and_get_result(session, prompt, selected_model, "Try Fine-Tuned Model")
                format_and_display_result(result, prompt)
        except Exception as e:
            add_log_entry(session, "Fetch Fine-Tuned Models", str(e))
            st.error(f"Failed to fetch or use fine-tuned models: {e}")

    elif fine_tune_action == "Check Status":
        st.subheader("Check Fine-Tuning Status")
        tracking_id_input = st.text_input("Enter Tracking ID", placeholder="Enter your tracking ID to check the status")
        tracking_id_input = tracking_id_input.strip()
        if st.button("Check Status", key="check_status_button"):
            if not tracking_id_input.strip():
                st.warning("Please enter a valid Tracking ID.")
            else:
                try:
                    # Query the status of the fine-tuning process
                    status_result = execute_fine_tune_status_query(session, tracking_id_input)

                    if status_result:
                        status_df = format_fine_tune_status_result(status_result)
                        st.table(status_df)
                    else:
                        st.error("No status information found for the given Tracking ID.")
                except Exception as e:
                    add_log_entry(session, "Check Fine-Tune Status", str(e))
                    st.error(f"Failed to retrieve status for Tracking ID `{tracking_id_input}`.")
