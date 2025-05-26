import streamlit as st
from src.utils import *
from src.cortex_functions import *
from src.query_result_builder import *
from src.notification import *
import asyncio
import threading
import json


config_path = Path("src/settings_config.json")
with open(config_path, "r") as f:
    config = json.load(f)

def display_rag(session):
    """
    Displays the Retrieval-Augmented Generation (RAG) interface in Streamlit.
    
    This function creates a user interface for either creating a new knowledge source
    by uploading documents and generating embeddings, or using an existing knowledge
    source to answer questions. It handles file uploads, embedding generation, and 
    question answering with RAG.

    Args:
        session: Snowflake session object for database operations

    The function provides options to:
    - Create knowledge source: Upload documents, select embedding type/model, create vector embeddings
    - Use knowledge source: Select existing embeddings table and ask questions using RAG
    """
    st.title("Retrieval-Augmented Generation (RAG)")
    st.subheader("Use Your Documents As Context To Answer Questions")

    # Display "Create or Use Knowledge Source" dropdown
    # create_or_use = st.selectbox("Select Action", ("Create Knowledge Source", "Use Knowledge Source"), key="create_or_use")

    # if create_or_use == "Create Knowledge Source":


    st.subheader("Choose Your Stage")
    # Row 1: Database and Schema Selection
    col1, col2 = st.columns(2)
    with col1:
        selected_db = st.selectbox("Database", list_databases(session))
    with col2:
        selected_schema = st.selectbox("Schema", list_schemas(session, selected_db))

    # Row 2: Stage Selection and File Upload
    col1, col2 = st.columns(2)
    with col1:
        stages = list_stages(session, selected_db, selected_schema)
        selected_stage = st.selectbox("Stage", stages or [])
    with col2:
        if selected_stage:
            if config["mode"] == "debug":
                uploaded_file = st.file_uploader("Upload File", type=["pdf", "txt"], help="Upload a PDF or TXT file (Max: 5MB)")
                if uploaded_file:
                    try:
                        upload_file_to_stage(session, selected_db, selected_schema, selected_stage, uploaded_file)
                    except Exception as e:
                        st.error(f"Failed to upload file: {e}")
                        add_log_entry(session, "Upload File", str(e))
            else:
                st.info("Upload Option Available Only in 'debug' Mode")


    # List files in the stage
    if selected_stage:
        try:
            file_details = list_file_details_in_stage(session, selected_db, selected_schema, selected_stage)
            st.info(f"Number of files in stage '{selected_stage}': {len(file_details)}")
            if file_details:
                import pandas as pd
                file_df = pd.DataFrame(file_details)
                st.table(file_df)
            else:
                st.warning(f"No files found in stage '{selected_stage}'.")
        except Exception as e:
            st.error(f"Failed to list files in stage: {e}")
            add_log_entry(session, "List Files in Stage", str(e))

        
    st.subheader("Choose Your Embeddings Type and Model")
    # Embedding Options
    col1, col2 = st.columns(2)
    with col1:
        embedding_type = st.selectbox("Embeddings", ["EMBED_TEXT_768","EMBED_TEXT_1024"])
    with col2:
        embedding_model = st.selectbox("Model", config["default_settings"]["embeddings"][embedding_type])
    # Output Table
    output_table_name = st.text_input("Output Table Name")
    print(output_table_name)

    # Create Embedding
    if st.button("Create"):
        # Add notification for process tracking
        details = f"Creating vector embeddings in table {output_table_name}"
        print("coming to notification")
        notification_id = add_notification_entry(session, "Create Embedding", "In-Progress", details)
        print("added to notification")
        try:
            # Trigger async embedding creation
            trigger_async_rag_process(
                session, selected_db, selected_schema, selected_stage, embedding_type,embedding_model,output_table_name, notification_id
            )
            st.success("Embedding creation initiated. Check notifications for updates.")
        except Exception as e:
            # Update notification to Failed and log the error
            update_notification_entry(session, notification_id, "Failed")
            add_log_entry(session, "Create Embedding", str(e))
            st.error(f"Failed to initiate embedding creation: {e}")



def trigger_async_rag_process(session, db, schema, stage, embedding_type, embedding_model, output_table, notification_id):
    """
    Triggers an asynchronous process to create vector embeddings from documents in a stage.

    This function initiates an asynchronous process that creates vector embeddings from 
    documents stored in a Snowflake stage. It handles the process management, error handling,
    and status notifications.

    Args:
        session: Snowflake session object
        db (str): Database name
        schema (str): Schema name 
        stage (str): Stage name containing the documents
        embedding_type (str): Type of embedding to generate
        embedding_model (str): Model to use for generating embeddings
        output_table (str): Name of table to store the embeddings
        notification_id (int): ID of the notification entry to track progress

    The function uses threading and asyncio to handle the asynchronous processing,
    and updates the notification status on completion or failure.
    """
    async def async_rag_process():
        try:
            # Simulate asynchronous processing
            await asyncio.sleep(1)
            
            # Create the embeddings (move this logic to the query_result_builder if necessary)
            create_vector_embedding_from_stage(session, db, schema, stage, embedding_type,embedding_model, output_table)
            
            # Update notification status to Success
            update_notification_entry(session, notification_id, "Success")
            st.success(f"Vector embeddings created successfully in '{output_table}'.")
        except Exception as e:
            # Log the error and update notification status to Failed
            update_notification_entry(session, notification_id, "Failed")
            add_log_entry(session, "Create Vector Embedding", str(e))
            st.error(f"An error occurred: {e}")
            raise e

    # Trigger async process using threading
    thread = threading.Thread(target=asyncio.run, args=(async_rag_process(),))
    thread.start()

