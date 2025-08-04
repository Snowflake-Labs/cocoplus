import streamlit as st
from snowflake.snowpark import Session
from snowflake.snowpark.exceptions import SnowparkSQLException
from pathlib import Path
import json
import time
import base64
import snowflake.connector
from src.cortex_functions import *
from typing import List, Dict, Union, Optional
# from streamlit_mic_recorder import speech_to_text

# Load the config file
config_path = Path("src/settings_config.json")
with open(config_path, "r") as f:
    config = json.load(f)

def render_image(filepath: str):
    """
    Renders an image in Streamlit from a filepath.
    
    Args:
        filepath (str): Path to the image file. Must have a valid file extension.
    """
    mime_type = filepath.split('.')[-1:][0].lower()
    with open(filepath, "rb") as f:
        content_bytes = f.read()
        content_b64encoded = base64.b64encode(content_bytes).decode()
        image_string = f'data:image/{mime_type};base64,{content_b64encoded}'
        image_html = f"""
            <div style="text-align: center;">
                <img src="{image_string}" alt="App Logo" style="width: 200px;">
            </div>
        """
        st.sidebar.markdown(image_html, unsafe_allow_html=True)

def list_cortex_services(session,database,schema):
    q = f"SHOW CORTEX SEARCH SERVICES IN {database}.{schema}"
    return [row["name"] for row in session.sql(q).collect()]

def fetch_cortex_service(session, service_name,database,schema):
    q = f"SHOW CORTEX SEARCH SERVICEs LIKE '{service_name}' IN {database}.{schema}"
    return session.sql(q).collect()

def cortex_search_data_scan(session, db, schema, service_name):
    service = f"{db}.{schema}.{service_name}"
    q = f"SELECT * FROM TABLE (CORTEX_SEARCH_DATA_SCAN (SERVICE_NAME => '{service}'));"
    return session.sql(q).collect()

def cortex_search_service_display(session, db, schema, service_name):
    service = f"{db}.{schema}.{service_name}"
    q = f"DESCRIBE CORTEX SEARCH SERVICE {service};"
    return session.sql(q).collect()
    
def list_databases(session):
    """
    Lists all databases in Snowflake.
    
    Args:
        session: Snowflake session object
        
    Returns:
        list: List of database names
    """
    return [row["name"] for row in session.sql("SHOW DATABASES").collect()]

def list_schemas(session, database: str):
    """
    Lists schemas in the specified database.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        
    Returns:
        list: List of schema names
    """
    return [row["name"] for row in session.sql(f"SHOW SCHEMAS IN {database}").collect()]

def list_stages(session, database: str, schema: str):
    """
    Lists stages in the specified database and schema.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        
    Returns:
        list: List of stage names
    """
    stages = [stage["name"] for stage in session.sql(f"SHOW STAGES IN {database}.{schema}").collect()]
    return stages

def list_files_in_stage(session, database: str, schema: str, stage: str):
    """
    Lists files in the specified stage.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        stage (str): Name of the stage
        
    Returns:
        list: List of file names in the stage
    """
    stage_path = f"@{database}.{schema}.{stage}"
    files = [file["name"] for file in session.sql(f"LIST {stage_path}").collect()]
    return files

def list_file_details_in_stage(session, database, schema, stage_name):
    """
    Lists detailed information about files in the specified stage.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        stage_name (str): Name of the stage
        
    Returns:
        list: List of dictionaries containing file details (name, size, last modified)
    """
    stage_path = f"@{database}.{schema}.{stage_name}"
    query = f"LIST {stage_path}"
    try:
        files = session.sql(query).collect()
        return [
            {
                "Filename": file["name"],
                "Size (Bytes)": file["size"],
                "Last Modified": file["last_modified"]
            }
            for file in files
        ]
    except Exception as e:
        st.error(f"Failed to list files in stage '{stage_name}': {e}")
        return []


def list_tables(session, database: str, schema: str):
    """
    Lists tables in the specified database and schema.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        
    Returns:
        list: List of table names
    """
    tables = [table["name"] for table in session.sql(f"SHOW TABLES IN {database}.{schema}").collect()]
    return tables

def list_columns(session, database: str, schema: str, table: str):
    """
    Lists columns in the specified table.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        table (str): Name of the table
        
    Returns:
        list: List of column names
    """
    return [row["column_name"] for row in session.sql(f"SHOW COLUMNS IN {database}.{schema}.{table}").collect()]

def show_spinner(message: str):
    """
    Displays a spinner with a custom message in Streamlit.
    
    Args:
        message (str): Message to display with the spinner
        
    Yields:
        None
    """
    with st.spinner(message):
        yield

def validate_table_columns(session, database, schema, table, required_columns):
    """
    Validates that a table has all required columns.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        table (str): Name of the table
        required_columns (list): List of required column names
        
    Returns:
        list: List of missing column names
        
    Raises:
        RuntimeError: If column validation fails
    """
    try:
        # Query to get the column names in the specified table
        query = f"SHOW COLUMNS IN {database}.{schema}.{table}"
        columns = session.sql(query).collect()

        # Extract existing column names from the query result
        existing_columns = [column["column_name"].upper() for column in columns]

        # Check for missing columns
        missing_columns = [col for col in required_columns if col.upper() not in existing_columns]

        return missing_columns
    except Exception as e:
        raise RuntimeError(f"Failed to validate columns for table '{table}': {e}")


def create_prompt_for_rag(session, question: str, rag: bool, column: str, database: str, schema: str, table: str,embedding_type:str,embedding_model:str, chat_history: list):
    """
    Creates a prompt for Retrieval-Augmented Generation (RAG).
    
    Args:
        session: Snowflake session object
        question (str): User's question
        rag (bool): Whether to use RAG
        column (str): Column name containing embeddings
        database (str): Name of the database
        schema (str): Name of the schema
        table (str): Name of the table
        embedding_type (str): Type of embedding
        embedding_model (str): Name of the embedding model
        chat_history (list): List of chat messages
    Returns:
        str: Generated prompt
    """
    if rag and column:
        cmd = f"""
        WITH results AS (
            SELECT RELATIVE_PATH,
                VECTOR_COSINE_SIMILARITY({column},
                SNOWFLAKE.CORTEX.{embedding_type}('{embedding_model}', ?)) AS similarity,
                chunk
            FROM {database}.{schema}.{table}
            ORDER BY similarity DESC
            LIMIT 3
        )
        SELECT chunk, relative_path FROM results;
        """
        
        question_rewrite = session.sql(cmd, [question]).collect()

        # Include chat history in the prompt
        chat_history_str = "\n".join(f"{msg['role']}: {msg['content']}" for msg in chat_history)

        prompt = f"""
        You are an AI assistant using RAG. Use the past messages and retrieved context to provide relevant answers. Note: Need not mention what the answer is based on.

        <chat_history>
        {chat_history_str}
        </chat_history>

        <retrieved_context>
        {question_rewrite}
        </retrieved_context>

        <question>
        {question}
        </question>

        Answer:
        """
    else:
        if len(chat_history):
            chat_history_str = "\n".join(f"{msg['role']}: {msg['content']}" for msg in chat_history)
        else:
            chat_history_str = ""

        prompt = f"""
        You are an AI assistant. Use the past messages to understand context and provide relevant answers. Note: Need not mention what the answer is based on.

        <chat_history>
        {chat_history_str}
        </chat_history>

        <question>
        {question}
        </question>

        Answer:
        """
    return prompt

def get_cortex_complete_result(session, query: str):
    """
    Executes a Cortex complete query and returns the result.
    
    Args:
        session: Snowflake session object
        query (str): SQL query to execute
        
    Returns:
        str: Query result
    """
    return session.sql(query).collect()[0][0]

def enhance_prompt(session, original_prompt: str, enhancement_type: str = "refine", model: str = None):
    """
    Enhances a user prompt using Snowflake's CORTEX.COMPLETE function with different enhancement types.
    
    Args:
        session: Snowflake session object
        original_prompt (str): The original prompt to enhance
        enhancement_type (str): Type of enhancement - "refine", "elaborate", "rephrase", "shorten", "formal", "informal"
        model (str): Model to use for enhancement (optional, defaults to config)
        
    Returns:
        str: Enhanced prompt
    """
    if not original_prompt or not original_prompt.strip():
        return original_prompt
    
    # Use default model from config if not provided
    if not model:
        model = config.get("default_settings", {}).get("model", ["mistral-large"])
        if isinstance(model, list):
            model = model[0]
    
    # Create enhancement instructions based on type
    enhancement_instructions = {
        "refine": f"""You are an expert prompt engineer. Refine the following prompt to make it more detailed, specific, and effective for getting better AI responses. 

Guidelines:
1. Keep the original intent and meaning intact
2. Add specific details and context where appropriate
3. Make the prompt clearer and more actionable
4. Add relevant constraints or formatting instructions if beneficial
5. Ensure the enhanced prompt is concise but comprehensive

Original prompt: "{original_prompt}"

Please provide only the refined prompt without any explanations or additional text:""",

        "formal": f"""You are an expert prompt engineer. Convert the following prompt to a formal tone, making it more professional, structured, and appropriate for business or academic contexts.

Guidelines:
1. Use formal language and professional vocabulary
2. Structure sentences with proper grammar and syntax
3. Remove casual expressions and colloquialisms
4. Maintain the original intent and requirements
5. Make it sound authoritative and well-structured

Original prompt: "{original_prompt}"

Please provide only the formalized prompt without any explanations or additional text:""",

        "informal": f"""You are an expert prompt engineer. Convert the following prompt to an informal, conversational tone while maintaining its effectiveness and clarity.

Guidelines:
1. Use casual, friendly language that feels natural
2. Make it sound conversational and approachable
3. Remove overly formal or stiff language
4. Keep the original intent and all requirements intact
5. Ensure it sounds engaging and easy to understand

Original prompt: "{original_prompt}"

Please provide only the informal prompt without any explanations or additional text:""",

        "elaborate": f"""You are an expert prompt engineer. Elaborate on the following prompt by adding more detail, context, and specific instructions to make it more comprehensive and effective.

Guidelines:
1. Expand on the original request with relevant details
2. Add context that would help produce better responses
3. Include specific formatting or output requirements
4. Provide examples or clarifications where helpful
5. Keep the core intent clear and focused

Original prompt: "{original_prompt}"

Please provide only the elaborated prompt without any explanations or additional text:""",

        "rephrase": f"""You are an expert prompt engineer. Rephrase the following prompt using different wording while maintaining the exact same meaning and intent.

Guidelines:
1. Use alternative vocabulary and sentence structures
2. Keep the same meaning and intent
3. Make it clearer and more effective
4. Ensure the rephrased version is engaging and well-structured

Original prompt: "{original_prompt}"

Please provide only the rephrased prompt without any explanations or additional text:""",

        "shorten": f"""You are an expert prompt engineer. Shorten the following prompt while preserving all essential information and maintaining effectiveness.

Guidelines:
1. Remove unnecessary words and redundancy
2. Keep all critical information and requirements
3. Maintain clarity and effectiveness
4. Ensure the shortened version is still complete and actionable

Original prompt: "{original_prompt}"

Please provide only the shortened prompt without any explanations or additional text:"""
    }
    
    # Get the appropriate enhancement instruction
    enhancement_instruction = enhancement_instructions.get(enhancement_type.lower(), enhancement_instructions["refine"])
    
    try:
        # Execute CORTEX.COMPLETE query
        from src.notification import execute_cortex_with_logging, escape_sql_string
        
        query = f"""
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            '{model}',
            '{escape_sql_string(enhancement_instruction)}'
        )
        """
        result, notification_id = execute_cortex_with_logging(
            session=session,
            cortex_query=query,
            function_name="COMPLETE",
            model_name=model,
            input_text=enhancement_instruction,
            details=f"Prompt enhancement - {enhancement_type}"
        )
        if result:
            # Clean the result to make it JSON-parse friendly
            cleaned_result = result.strip()
            
            # Remove common prefixes/suffixes that models might add
            if cleaned_result.startswith('"') and cleaned_result.endswith('"'):
                cleaned_result = cleaned_result[1:-1]
            
            # Handle escaped quotes and newlines properly
            cleaned_result = cleaned_result.replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
            
            return cleaned_result
        else:
            return original_prompt
            
    except Exception as e:
        print(f"Error enhancing prompt: {e}")
        return original_prompt

def list_existing_models(session):
    """
    Lists existing models in Snowflake.
    
    Args:
        session: Snowflake session object
        
    Returns:
        list: List of model names
    """
    query = "SHOW MODELS"  # Hypothetical query to show models
    return [model["name"] for model in session.sql(query).collect()]

def list_fine_tuned_models(session):
    """
    Lists fine-tuned models in Snowflake.
    
    Args:
        session: Snowflake session object
        
    Returns:
        list: List of fine-tuned model names
    """
    query = "SHOW FINE_TUNED_MODELS"  # Hypothetical query to show fine-tuned models
    return [model["name"] for model in session.sql(query).collect()]

def get_table_preview(session, database, schema, table):
    """
    Fetches a preview of the top 5 rows from a table.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        table (str): Name of the table
        
    Returns:
        pandas.DataFrame: DataFrame containing preview data
    """
    query = f"SELECT * FROM {database}.{schema}.{table} LIMIT 5"
    df = session.sql(query).to_pandas()
    return df

def load_css(filepath):
    """
    Loads and applies custom CSS from a file.
    
    Args:
        filepath (str): Path to the CSS file
    """
    with open(filepath) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

def format_result(result_json):
    """
    Formats the result from a Cortex query.
    
    Args:
        result_json (dict): JSON response from Cortex
        
    Returns:
        dict: Formatted result containing messages, model used, and usage statistics
    """
    messages = result_json.get('choices', [{}])[0].get('messages', 'No messages found')
    model_used = result_json.get('model', 'No model specified')
    usage = result_json.get('usage', {})
    return {
        "messages": messages,
        "model_used": model_used,
        "usage": usage
    }

def write_result_to_output_table(session, output_table, output_column, result):
    """
    Writes a result to the specified output table and column.
    
    Args:
        session: Snowflake session object
        output_table (str): Name of the output table
        output_column (str): Name of the output column
        result: Result to write
    """
    insert_query = f"INSERT INTO {output_table} ({output_column}) VALUES (?)"
    session.sql(insert_query, [result]).collect()

def create_database_and_stage_if_not_exists(session: Session):
    """
    Creates the CORTEX_TOOLKIT database and MY_STAGE stage if they do not already exist.
    
    Args:
        session (Session): Snowflake session object
    """
    # Fetch database and stage details from the config file
    database_name = config["database"]
    stage_name = config["stage"]

    # Check if the database exists, and create if it doesn't
    database_query = f"SHOW DATABASES LIKE '{database_name}'"
    existing_databases = session.sql(database_query).collect()

    if not existing_databases:
        session.sql(f"CREATE DATABASE IF NOT EXISTS {database_name}").collect()
    else:
        pass
        #print(f"Database '{database_name}' already exists. Skipping creation.")

    # Check if the stage exists, and create if it doesn't
    stage_query = f"SHOW STAGES LIKE '{stage_name}'"
    existing_stages = session.sql(stage_query).collect()

    if not existing_stages:
        session.sql(f"CREATE STAGE IF NOT EXISTS {database_name}.PUBLIC.{stage_name}").collect()
    else:
        pass
        #print(f"Stage '{stage_name}' already exists in '{database_name}'. Skipping creation.")

def create_stage(session, database, schema, stage_name):
    """
    Creates a stage in the specified database and schema.
    
    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        stage_name (str): Name of the stage to create
        
    Raises:
        SnowparkSQLException: If stage creation fails
    """
    query = f"CREATE STAGE IF NOT EXISTS {database}.{schema}.{stage_name}"
    try:
        session.sql(query).collect()
    except SnowparkSQLException as e:
        st.error(f"Failed to create stage: {e}")
        raise e


def upload_file_to_stage(session, database, schema, stage_name, file):
    """
    Uploads a file to the specified stage in Snowflake using the PUT command.

    Args:
        session: Snowflake session object
        database (str): Name of the database
        schema (str): Name of the schema
        stage_name (str): Name of the stage where the file will be uploaded
        file: File object from Streamlit file uploader
        
    Raises:
        Exception: If file upload fails
    """
    import tempfile
    import os

    # Construct stage path
    stage_path = f"@{database}.{schema}.{stage_name}"

    # Save the uploaded file temporarily
    temp_dir = tempfile.gettempdir()  # Use system temporary directory
    temp_file_path = os.path.join(temp_dir, file.name)
    temp_file_path = temp_file_path.replace("\\", "/")  # Ensure the path uses forward slashes for compatibility
    print("temp_file_path:", temp_file_path)

    try:
        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(file.read())

        # Upload the file to the Snowflake stage
        put_query = f"PUT 'file://{temp_file_path}' {stage_path} AUTO_COMPRESS=FALSE"
        print("PUT Query:", put_query)  # For debugging
        session.sql(put_query).collect()

        st.success(f"File '{file.name}' uploaded successfully to stage '{stage_name}'.")
    except Exception as e:
        # Log the full traceback
        import traceback
        trace = traceback.format_exc()
        st.error(f"Failed to upload file: {e}")
        st.error(f"Traceback:\n{trace}")
        raise e
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


import streamlit as st
import time

def show_toast_message(message, duration=3, toast_type="info", position="top-right"):
    """
    Displays a toast message in Streamlit using a temporary container.
    
    Args:
        message (str): Message to display in the toast
        duration (int, optional): Duration in seconds to show the toast. Defaults to 3.
        toast_type (str, optional): Type of toast ("info", "success", "warning", "error"). Defaults to "info".
        position (str, optional): Position of the toast ("top-right", "top-left", "bottom-right", "bottom-left"). Defaults to "top-right".
    """
    # Define color styles based on the toast type
    toast_colors = {
        "info": "#007bff",
        "success": "#28a745",
        "warning": "#ffc107",
        "error": "#dc3545"
    }

    # Define position styles
    position_styles = {
        "top-right": "top: 20px; right: 20px;",
        "top-left": "top: 20px; left: 20px;",
        "bottom-right": "bottom: 20px; right: 20px;",
        "bottom-left": "bottom: 20px; left: 20px;"
    }

    color = toast_colors.get(toast_type, "#007bff")  # Default to "info" color
    pos_style = position_styles.get(position, "top: 20px; right: 20px;")  # Default to "top-right"

    # Create a temporary container to display the toast
    toast_container = st.empty()

    # Use custom HTML and CSS to display a toast-like message
    toast_html = f"""
    <div style="
        position: fixed;
        {pos_style}
        background-color: {color};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: Arial, sans-serif;
    ">
        {message}
    </div>
    """

    # Display the toast message
    toast_container.markdown(toast_html, unsafe_allow_html=True)

    # Wait for the specified duration, then clear the container
    time.sleep(duration)
    toast_container.empty()

def setup_pdf_text_chunker(session):
    """
    Sets up the pdf_text_chunker UDF in the current database and schema.
    
    Args:
        session: Snowflake session object
        
    Note:
        Creates a Python UDF that can process PDF files and split them into text chunks
    """
    # Check if UDF already exists
    try:
        udf_check_query = "SHOW USER FUNCTIONS LIKE 'pdf_text_chunker'"
        existing_udfs = session.sql(udf_check_query).collect()
        if existing_udfs:
            #st.info("UDF pdf_text_chunker already exists. Skipping creation.")
            return
    except Exception as e:
        st.error(f"Error checking UDF existence: {e}")
        return

    # Create UDF if it doesn't exist
    create_udf_query = """
    CREATE OR REPLACE FUNCTION pdf_text_chunker(file_url STRING)
    RETURNS TABLE (chunk VARCHAR)
    LANGUAGE PYTHON
    RUNTIME_VERSION = '3.9'
    HANDLER = 'pdf_text_chunker'
    PACKAGES = ('snowflake-snowpark-python', 'PyPDF2', 'langchain')
    AS
    $$
import PyPDF2
import io
import pandas as pd
from snowflake.snowpark.files import SnowflakeFile
from langchain.text_splitter import RecursiveCharacterTextSplitter

class pdf_text_chunker:
    def read_pdf(self, file_url: str) -> str:
        with SnowflakeFile.open(file_url, 'rb') as f:
            buffer = io.BytesIO(f.readall())
        reader = PyPDF2.PdfReader(buffer)
        text = ""
        for page in reader.pages:
            try:
                text += page.extract_text().replace('\\n', ' ').replace('\\0', ' ')
            except:
                text = "Unable to Extract"
        return text

    def process(self, file_url: str):
        text = self.read_pdf(file_url)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=400,
            length_function=len
        )
        chunks = text_splitter.split_text(text)
        df = pd.DataFrame(chunks, columns=['chunk'])
        yield from df.itertuples(index=False, name=None)
    $$
    """
    try:
        session.sql(create_udf_query).collect()
        #st.success("UDF pdf_text_chunker created successfully.")
    except Exception as e:
        st.error(f"Error creating UDF: {e}")


def make_llm_call(session,system_prompt, prompt, model):
    prompt = prompt.replace("'", "''").replace("\n", "\\n").replace("\\", "\\\\")
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})

    messages_json = escape_sql_string(json.dumps(messages))

    query = f"""
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
        '{model}',
        PARSE_JSON('{messages_json}')
    );
    """
    try:
        from src.notification import execute_cortex_with_logging
        
        result, notification_id = execute_cortex_with_logging(
            session=session,
            cortex_query=query,
            function_name="COMPLETE",
            model_name=model,
            input_text=prompt,
            details="LLM call with system and user prompts"
        )
        return result
    except SnowparkSQLException as e:
        raise e

def get_ai_complete_result(session, model, prompt, model_parameters=None, response_format=None, show_details=False):
    """
    Executes the AI_COMPLETE function for a text prompt.
    
    Args:
        session: Snowflake session object
        model: String specifying the language model
        prompt: Text prompt for completion
        model_parameters: Optional dict with temperature, top_p, max_tokens, guardrails
        response_format: Optional JSON schema for structured output
        show_details: Boolean to include detailed output (choices, created, model, usage)
    
    Returns:
        Completion result as a string or JSON object
    """
    if not prompt:
        raise ValueError("Prompt cannot be empty.")
    if not model:
        raise ValueError("Model must be specified.")

    prompt = prompt.replace("'", "''")

    model_parameters_json = None
    if model_parameters:
        if not isinstance(model_parameters, dict):
            raise ValueError("Model parameters must be a dictionary.")
        valid_params = {}
        allowed_keys = {'temperature', 'top_p', 'max_tokens', 'guardrails'}
        for key in model_parameters:
            if key not in allowed_keys:
                print(f"Warning: Ignoring invalid model parameter '{key}'")
                continue
            valid_params[key] = model_parameters[key]
        if valid_params:
            model_parameters_json = json.dumps(valid_params, ensure_ascii=False).replace("'", "''")

    response_format_json = None
    if response_format:
        if not isinstance(response_format, dict):
            raise ValueError("Response format must be a dictionary.")
        response_format_json = json.dumps(response_format, ensure_ascii=False).replace("'", "''")

    try:
        query = f"SELECT AI_COMPLETE('{model}', '{prompt}')"
        print(f"Generated SQL Query: {query}")

        result = session.sql(query).collect()[0][0]
        return result
    except SnowparkSQLException as e:
        print(f"SQL Error: {e}")
        raise

def get_ai_similarity_result(session, input1, input2, config_object=None, input_type="Text", stage=None, file1=None, file2=None):
    """
    Executes the AI_SIMILARITY function for text or image inputs.
    
    Args:
        session: Snowflake session object
        input1: First text input or file path for image
        input2: Second text input or file path for image
        config_object: Optional configuration object with 'model' key
        input_type: "Text" or "Image"
        stage: Stage path for image inputs
        file1: First image file name
        file2: Second image file name
    
    Returns:
        Float similarity score between -1 and 1
    """
    if input_type == "Text" and (not input1 or not input2):
        raise ValueError("Both text inputs must be non-empty.")
    if input_type == "Image" and (not stage or not file1 or not file2):
        raise ValueError("Stage and both image files must be provided.")

    config_json = None
    if config_object:
        if not isinstance(config_object, dict):
            raise ValueError("Config object must be a dictionary.")
        valid_config = {}
        allowed_keys = {'model'}
        for key in config_object:
            if key not in allowed_keys:
                print(f"Warning: Ignoring invalid config key '{key}'")
                continue
            valid_config[key] = config_object[key]
        if valid_config:
            config_json = json.dumps(valid_config, ensure_ascii=False).replace("'", "''")

    try:
        if input_type == "Text":
            input1 = input1.replace("'", "''")
            input2 = input2.replace("'", "''")
            query = f"SELECT AI_SIMILARITY('{input1}', '{input2}'"
        else:
            file_path1 = f"{stage}/{file1}"
            file_path2 = f"{stage}/{file2}"
            query = f"SELECT AI_SIMILARITY(TO_FILE('{file_path1}'), TO_FILE('{file_path2}')"
        
        if config_json:
            query += f", PARSE_JSON('{config_json}')"
        query += ")"

        print(f"Generated SQL Query: {query}")

        result = session.sql(query).collect()[0][0]
        return result
    except SnowparkSQLException as e:
        print(f"SQL Error: {e}")
        raise

def get_ai_classify_result(
    session,
    input_data: Union[str, Dict],
    categories: List[Union[str, Dict]],
    config_object: Optional[Dict] = None,
    input_type: str = "Text",
    stage: Optional[str] = None,
    file_name: Optional[str] = None
) -> str:
    """
    Execute AI_CLASSIFY query for text or image classification.
    
    Args:
        session: Snowflake session object.
        input_data: Text input or dict with prompt for classification.
        categories: List of category dictionaries or strings.
        config_object: Optional configuration (task_description, output_mode, examples).
        input_type: 'Text' or 'Image'.
        stage: Stage path for image files (e.g., @db.schema.stage).
        file_name: File name for image input.
    
    Returns:
        Classification result as a JSON string or error message.
    """
    try:
        if input_type not in ["Text", "Image"]:
            return json.dumps({"error": "Invalid input_type. Must be 'Text' or 'Image'."})

        if not categories:
            return json.dumps({"error": "Categories list cannot be empty."})
        
        if isinstance(categories, list):
            if all(isinstance(cat, str) for cat in categories):
                categories_str = ", ".join(f"'{cat}'" for cat in categories)
            elif all(isinstance(cat, dict) for cat in categories):
                categories_str = ", ".join(f"'{cat.get('name', '')}'" for cat in categories if cat.get('name'))
            else:
                return json.dumps({"error": "Categories must be a list of strings or dictionaries with 'name' key."})
        else:
            return json.dumps({"error": "Categories must be a list."})

        if input_type == "Text":
            if isinstance(input_data, dict):
                input_text = input_data.get("prompt", "")
            elif isinstance(input_data, str):
                input_text = input_data
            else:
                return json.dumps({"error": "input_data must be a string or dict with 'prompt' key for Text input_type."})
            
            if not input_text:
                return json.dumps({"error": "Input text cannot be empty for Text input_type."})

            query = f"SELECT AI_CLASSIFY('{input_text}', ARRAY_CONSTRUCT({categories_str})) AS result"

        elif input_type == "Image":
            if not stage or not file_name:
                return json.dumps({"error": "Stage and file_name are required for Image input_type."})
            if not isinstance(input_data, dict):
                return json.dumps({"error": "input_data must be a dict for Image input_type."})
            
            query = f"SELECT AI_CLASSIFY('{stage}/{file_name}', ARRAY_CONSTRUCT({categories_str})) AS result"

        if config_object:
            task_description = config_object.get("task_description", "")
            output_mode = config_object.get("output_mode", "label")
            examples = config_object.get("examples", [])
            
            if task_description or examples or output_mode != "label":
                pass

        result = session.sql(query).collect()
        
        if not result:
            return json.dumps({"error": "No result returned from AI_CLASSIFY query."})

        classification_result = result[0]["RESULT"]
        
        if isinstance(classification_result, str):
            try:
                parsed_result = json.loads(classification_result)
                return json.dumps(parsed_result)
            except json.JSONDecodeError:
                return json.dumps({"classification": classification_result})
        else:
            return json.dumps(classification_result)

    except snowflake.connector.errors.ProgrammingError as e:
        return json.dumps({"error": f"Query execution failed: {str(e)}"})
    except Exception as e:
        return json.dumps({"error": f"An unexpected error occurred: {str(e)}"})
    
def get_ai_filter_result(
    session,
    input_data: str,
    stage: Optional[str] = None,
    file_name: Optional[str] = None
) -> str:
    """
    Execute AI_FILTER query for text or image filtering.
    
    Args:
        session: Snowflake session object.
        input_data: Text input or predicate for image filtering.
        stage: Stage path for image files (e.g., @db.schema.stage).
        file_name: File name for image input.
    
    Returns:
        Filter result as a JSON string or error message.
    """
    try:
        input_type = "Image" if stage and file_name else "Text"

        if input_type == "Text":
            if not input_data:
                return json.dumps({"error": "Input text cannot be empty for Text input_type."})
            if not isinstance(input_data, str):
                return json.dumps({"error": "input_data must be a string for Text input_type."})
            query = f"SELECT AI_FILTER('{input_data}') AS result"

        elif input_type == "Image":
            if not stage or not file_name:
                return json.dumps({"error": "Stage and file_name are required for Image input_type."})
            if not isinstance(input_data, str):
                return json.dumps({"error": "Predicate must be a string for Image input_type."})
            
            query = f"SELECT AI_FILTER('{input_data}', TO_FILE('{stage}/{file_name}')) AS result"

        result = session.sql(query).collect()
        
        if not result:
            return json.dumps({"error": "No result returned from AI_FILTER query."})

        filter_result = result[0]["RESULT"]
        
        if isinstance(filter_result, bool):
            return json.dumps({"result": filter_result})
        elif isinstance(filter_result, str):
            try:
                parsed_result = json.loads(filter_result)
                return json.dumps(parsed_result)
            except json.JSONDecodeError:
                return json.dumps({"result": filter_result})
        else:
            return json.dumps({"result": filter_result})

    except snowflake.connector.errors.ProgrammingError as e:
        return json.dumps({"error": f"Query execution failed: {str(e)}"})
    except Exception as e:
        return json.dumps({"error": f"An unexpected error occurred: {str(e)}"})
    
def list_table_columns(session, database, schema, table):
    """
    Lists columns in a specified table.
    """
    try:
        query = f"DESCRIBE TABLE {database}.{schema}.{table}"
        result = session.sql(query).collect()
        return [row['name'] for row in result]
    except Exception as e:
        st.error(f"Error listing columns: {e}")
        return []
