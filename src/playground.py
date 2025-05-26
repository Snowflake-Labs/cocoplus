import streamlit as st
import json
from src.cortex_functions import *
from snowflake.snowpark.exceptions import SnowparkSQLException
from src.query_result_builder import *
from snowflake.core import Root
from src.utils import *
from pathlib import Path
from src.cortex_agent import *

# Load the config file
config_path = Path("src/settings_config.json")
with open(config_path, "r") as f:
    config = json.load(f)

def execute_functionality(session, functionality, input_data, settings):
    """
    Executes the selected functionality in playground mode.
    """
    if functionality == "Complete":
        result_json = get_complete_result(
            session, settings['model'], input_data['prompt'],
            settings['temperature'], settings['max_tokens'], settings['guardrails'], settings['system_prompt']
        )
        result_formatted = format_result(result_json)
        st.write("Completion Result")
        st.write(f"**Messages:**")
        st.success(result_formatted['messages'])
    
    elif functionality == "Complete Multimodal":
        result = get_complete_multimodal_result(
            session, settings['model'], input_data['prompt'], settings["stage"], settings["files"],
        )
        # st.write("Completion Multimodal Result")
        if len(settings["files"]) == 1:
            path = f"@{settings['stage']}/{settings['files'][0]}"
            image = session.file.get_stream(path, decompress=False).read()
            st.image(image)
        st.write(result)

    elif functionality == "Translate":
        result = get_translation(session,input_data['text'], settings['source_lang'], settings['target_lang'])
        st.write(f"**Translated Text:** {result}")

    elif functionality == "Summarize":
        result = get_summary(session,input_data['text'])
        st.write(f"**Summary:** {result}")

    elif functionality == "Extract":
        result = get_extraction(session,input_data['text'], input_data['query'])
        st.write(f"**Extracted Answer:** {result}")

    elif functionality == "Sentiment":
        if input_data["toggle"]:
            result = get_entity_sentiment(session,input_data['text'], input_data['entities'])
            st.write(f"**Entity Sentiment Analysis Result:** {result}")
        else:
            result = get_sentiment(session,input_data['text'])
            st.write(f"**Sentiment Analysis Result:** {result}")
    elif functionality == "Classify Text":
        result = get_classification(session,input_data['text'], input_data['categories'])
        st.write(f"**Classification Result:** {result}")
    elif functionality == "Parse Document":
        result = get_parse_document(session, settings["stage"], settings["file"], input_data["mode"])
        st.write(f"**Parsed Document Result:**")
        # print(result)
        res = json.loads(result)
        st.write(res["content"])

def get_functionality_settings(functionality, config, session=None):
    """
    Returns settings based on the selected functionality from config.
    """
    settings = {}
    defaults = config["default_settings"]

    if functionality == "Complete":
        col1, col2 = st.columns(2)
        with col1: 
            model_type = st.selectbox("Model Type", ["Base","Fine Tuned", "Private Preview"])
        with col2:
            if model_type == "Base":
                settings['model'] = st.selectbox("Change chatbot model:", defaults['model'])
            elif model_type == "Private Preview":
                settings['model'] = st.selectbox("Change chatbot model:", defaults['private_preview_models'])
            else:
                fine_tuned_models = fetch_fine_tuned_models(session)
                settings['model'] = st.selectbox("Change chatbot model:", fine_tuned_models)        
        settings['temperature'] = st.slider("Temperature:", defaults['temperature_min'], defaults['temperature_max'], defaults['temperature'])
        settings['max_tokens'] = st.slider("Max Tokens:", defaults['max_tokens_min'], defaults['max_tokens_max'], defaults['max_tokens'])
        settings['guardrails'] = st.checkbox("Enable Guardrails", value=defaults['guardrails'])
        settings['system_prompt'] = st.text_area("System Prompt (optional):", placeholder="Enter a system prompt...")
    elif functionality == "Complete Multimodal":
        col1, col2 = st.columns(2)
        with col1: 
            selected_model = st.selectbox("Models", config["default_settings"]["complete_multimodal"])
            settings['model'] = selected_model
        with col2:
            selected_db = st.selectbox("Databases",list_databases(session))
            settings["db"] = selected_db
        with col1:
            selected_schema = st.selectbox("Schemas",list_schemas(session,selected_db))
            settings["schema"] = selected_schema
        with col2:
            selected_stage = st.selectbox("Stage",list_stages(session,selected_db,selected_schema))
            stage = f"{selected_db}.{selected_schema}.{selected_stage}"
            settings["stage"] = stage
        if selected_stage:
            list = list_files_in_stage(session,selected_db,selected_schema,selected_stage)
            list = [file.split("/")[-1] for file in list]
            # add index to the list, starts from 0
            list = [f"{i}: {file}" for i, file in enumerate(list)]
            if not list:
                st.warning("No files found in the selected stage.")
                return
            files = st.multiselect("Images",list)
            # remove indeces from the list
            files = [file.split(": ")[-1] for file in files]
            if not files:
                st.warning("No files selected.")
                return
            settings["files"] = files

    elif functionality == "Translate":
        settings['source_lang'] = st.selectbox("Source Language", defaults['languages'])
        settings['target_lang'] = st.selectbox("Target Language", defaults['languages'])
    elif functionality == "Parse Document":
        col1, col2 = st.columns(2)
        with col1:
            selected_db = st.selectbox("Databases",list_databases(session))
            settings["db"] = selected_db
        with col2:
            selected_schema = st.selectbox("Schemas",list_schemas(session,selected_db))
            settings["schema"] = selected_schema
        with col1:
            selected_stage = st.selectbox("Stage",list_stages(session,selected_db,selected_schema))
            stage = f"@{selected_db}.{selected_schema}.{selected_stage}"
            settings["stage"] = stage
        if selected_stage:
            list = list_files_in_stage(session,selected_db,selected_schema,selected_stage)
            list = [file.split("/")[-1] for file in list]
            # add index to the list, starts from 0
            if not list:
                st.warning("No files found in the selected stage.")
                return
            with col2:
                file = st.selectbox("File",list)
            # remove indeces from the list
            if not file:
                st.warning("No files selected.")
                return
            settings["file"] = file
        # mode = st.selectbox("Mode", ["OCR", "LAYOUT"])
        # settings["mode"] = mode
    return settings

def get_playground_input(functionality):
    """
    Returns input data for playground mode based on selected functionality.
    """
    input_data = {}
    
    if functionality == "Complete":
        input_data['prompt'] = st.text_area("Enter a prompt:", placeholder="Type your prompt here...")
        input_data["prompt"] = input_data["prompt"].strip()
    elif functionality == "Complete Multimodal":
        input_data['prompt'] = st.text_area("Enter a prompt:", placeholder="Type your prompt here...")
        input_data["prompt"] = input_data["prompt"].strip()
    elif functionality == "Translate":
        input_data['text'] = st.text_area("Enter text to translate:", placeholder="Type your text here...")
    elif functionality == "Summarize":
        input_data['text'] = st.text_area("Enter text to summarize:", placeholder="Type your text here...")
    elif functionality == "Extract":
        input_data['text'] = st.text_area("Enter the text:", placeholder="Type your text here...")
        input_data['query'] = st.text_input("Enter your query:", placeholder="Type your query here...")
    elif functionality == "Sentiment":
        toggle = st.toggle("ENTITY_SENTIMENT")
        input_data["toggle"] = toggle
        # print(input_data["toggle"])
        if toggle:
            input_data['text'] = st.text_input("Enter text for entity sentiment analysis:", placeholder="Type your text here...")
            input_data["entities"] = st.text_input("Enter entities (comma-separated):", placeholder="Type your entities here...")
        else:
            input_data['text'] = st.text_area("Enter text for sentiment analysis:", placeholder="Type your text here...")
    elif functionality == "Classify Text":
        input_data['text'] = st.text_area("Enter text to classify:", placeholder="Type your text here...")
        input_data["categories"] = st.text_input("Enter categories (comma-separated):", placeholder="Type your categories here...")
    elif functionality == "Parse Document":
        input_data["mode"] = st.selectbox("Mode", ["OCR", "LAYOUT"])

    return input_data

def display_playground(session):
    """
    Displays the playground mode interface in Streamlit.
    """
    st.title("Playground")

    if "messages" not in st.session_state:
        st.session_state.messages = []

    if "cortex_chat" not in st.session_state:
        st.session_state.cortex_chat = []
    
    slide_window = 20

    choose_col1, choose_col2 = st.columns(2)
    with choose_col1:
        choices = st.selectbox("Choose Functionality", ["LLM Functions","Chat"])
    
    if choices == "LLM Functions":
        with choose_col2:
            functionality = st.selectbox(
                "Choose functionality:",
                ["Complete", "Complete Multimodal","Translate", "Summarize", "Extract", "Sentiment","Classify Text","Parse Document"]
            )

        if functionality != "Select Functionality":
            settings = get_functionality_settings(functionality, config, session)
            input_data = get_playground_input(functionality)

            if st.button(f"Run"):
                try:
                    execute_functionality(session, functionality, input_data, settings)
                except SnowparkSQLException as e:
                    st.error(f"Error: {e}")
   
    elif choices == "Chat":
        with choose_col2:
            options = st.selectbox("Choose one of the options", ["Search Service","RAG","Cortex Agent"])
        
        if options == "Search Service":
            # Settings in expander
            with st.expander("Settings", expanded=True):
                st.subheader("Choose Your Search Service")
                col1, col2 = st.columns(2)
                with col1:
                    selected_db = st.selectbox("Database", list_databases(session))
                with col2:
                    selected_schema = st.selectbox("Schema", list_schemas(session, selected_db))

                col1, col2 = st.columns(2)
                with col1:
                    cortex_services = list_cortex_services(session,selected_db,selected_schema)
                    selected_service = st.selectbox("Service", cortex_services or [])
                attributes = []
                if selected_service:
                    if "prev_selected_service" not in st.session_state:
                        st.session_state.prev_selected_service = selected_service
                    if st.session_state.prev_selected_service != selected_service:
                        st.session_state.cortex_chat = []
                        st.session_state.prev_selected_service = selected_service 

                    with col2:
                        data = fetch_cortex_service(session,selected_service,selected_db,selected_schema)
                        row = data[0]
                        cols = row.columns.split(",")
                        attributes = row.attribute_columns.split(",")
                        columns = st.multiselect("Display Columns", cols)
                
                st.subheader("Create Filter & Limits")
                col3, col4 = st.columns(2)
                with col3:
                    filter_column = st.selectbox("Filter Columns", attributes)
                with col4:
                    filter_operator = st.selectbox("Filter Operator", ["@eq", "@contains", "@gte", "@lte"])
                filter_value = st.text_input(f"Enter value for {filter_operator} on {filter_column}")

                if filter_column and filter_operator and filter_value:
                    if filter_operator == "@eq":
                        filter = { "@eq": { filter_column: filter_value } }
                    elif filter_operator == "@contains":
                        filter = { "@contains": { filter_column: filter_value } }
                    elif filter_operator == "@gte":
                        filter = { "@gte": { filter_column: filter_value } }
                    elif filter_operator == "@lte":
                        filter = { "@lte": { filter_column: filter_value } }
                    st.write(f"Generated Filter: {filter}")
                else:
                    filter = {}
                limit = st.slider("Limit Results", min_value=1, max_value=10, value=1)

                st.subheader("Choose Your Model")
                col5, col6 = st.columns(2)
                with col5:
                    model_type = st.selectbox("Model Type", ["Base","Fine Tuned", "Private Preview"])
                with col6:
                    if model_type == "Base":
                        selected_model = st.selectbox("Model", config["default_settings"]["model"])
                    elif model_type == "Private Preview":
                        selected_model = st.selectbox("Model", config["default_settings"]["private_preview_models"])
                    else:
                        fine_tuned_models = fetch_fine_tuned_models(session)
                        selected_model = st.selectbox("Model", fine_tuned_models)

            # Chat container
            chat_placeholder = st.container(border=True, height=700)
            with chat_placeholder:
                st.subheader("Chat Messages")
                for message in st.session_state.get("cortex_chat", []):
                    with st.chat_message(message["role"]):
                        st.markdown(message["content"])
            
            if question := st.chat_input("Enter your question"):
                if not columns:
                    show_toast_message("Please select columns to display.", position="bottom-right")
                    return
                st.session_state.cortex_chat.append({"role": "user", "content": question})
                with chat_placeholder: 
                    with st.chat_message("user"):
                        st.markdown(question)
                try:
                    root = Root(session)
                    service = (root
                            .databases[selected_db]
                            .schemas[selected_schema]
                            .cortex_search_services[selected_service.lower()]
                            )
                    columns = [col.lower() for col in columns]
                    resp = service.search(
                        query=question,
                        columns=columns,
                        filter=filter, 
                        limit=int(limit)
                    )
                    
                    retrieved_data = resp 

                    def get_chat_history():
                        start_index = max(0, len(st.session_state.cortex_chat) - slide_window)
                        filtered_history = [
                            msg for msg in st.session_state.messages[start_index:] if not msg["content"].startswith("An error occurred") 
                        ]
                        return filtered_history
                        
                    chat_history = get_chat_history()
                    
                    prompt = f"""
                            You are an AI assistant using Retrieval-Augmented Generation (RAG). Your task is to provide accurate and relevant answers based on the user's question, the retrieved context from a Cortex Search Service, and the prior chat history (if any). Follow these instructions:
                            1. Use the chat history to understand the conversation context, if context is empty, refer retrieved context.
                            2. Use the retrieved context to ground your answer in the provided data (this is in json form, so under the json keys and values fully).
                            3. Answer the question concisely and directly, without explicitly mentioning the sources (chat history or retrieved context) unless asked.   
                    
                            Note: Identify if the user is asking a question from the chat history or the retrieved context. If the user is asking a question from the chat history, answer the question based on the chat history. If the user is asking a question from the retrieved context, answer the question based on the retrieved context. If the user is asking a question from the chat history and the retrieved context, answer the question based on the chat history. If the user is asking a question that is not from the chat history or the retrieved context, answer the question based on the chat history.
                            
                            <chat_history>
                            {chat_history}
                            </chat_history>

                            <retrieved_context>
                            {retrieved_data}
                            </retrieved_context>

                            <question>
                            {question}
                            </question>

                            Answer:
                            """
                    
                    if prompt:
                        prompt = prompt.replace("'", "\\'")
                    res = execute_query_and_get_result(session,prompt,selected_model,"Generate RAG Response")

                    result_json = json.loads(res)
                    response_1 = result_json.get("choices", [{}])[0].get("messages", "No messages found")
                    st.session_state.cortex_chat.append({"role": "assistant", "content": response_1})
                    with chat_placeholder:
                        with st.chat_message("assistant"):
                            st.markdown(response_1)
                except Exception as e:
                    add_log_entry(session, "Generate Search Response", str(e))
                    with chat_placeholder:
                        with st.chat_message("assistant"):
                            st.markdown("An error occurred. Please check logs for details.")
                    st.session_state.cortex_chat.append({"role": "assistant", "content": "An error occurred. Please check logs for details."})

                # st.rerun(scope="fragment")
        
        elif options == "RAG":
            # Settings in expander
            with st.expander("Settings", expanded=True):
                st.subheader("Choose Your Embeddings")
                col1, col2 = st.columns(2)
                with col1:
                    selected_db = st.selectbox("Database", list_databases(session))
                with col2:
                    selected_schema = st.selectbox("Schema", list_schemas(session, selected_db))

                col1, col2 = st.columns(2)
                with col1:
                    selected_table = st.selectbox("Table", list_tables(session, selected_db, selected_schema) or [] )
                    if "prev_selected_table" not in st.session_state:
                        st.session_state.prev_selected_table = selected_table
                    if st.session_state.prev_selected_table != selected_table:
                        st.session_state.messages = []
                        st.session_state.prev_selected_table = selected_table            
                
                with col2:
                    if selected_table:
                        required_columns = ["Vector_Embeddings"]
                        missing_cols = validate_table_columns(session, selected_db, selected_schema, selected_table, required_columns)
                        if missing_cols:
                            st.info("The table is missing vector_embeddings column. Please use the appropriate table.")
                        else:
                            selected_column = st.selectbox("Column", ["Vector_Embeddings"])

                st.subheader("Choose Your Models") 
                col1,col2=  st.columns(2)
                with col1:
                    model_type = st.selectbox("Model Type", ["Base","Fine Tuned", "Private Preview"])
                with col2:
                    if model_type == "Base":
                        selected_model = st.selectbox("Model", config["default_settings"]["model"])
                    elif model_type == "Private Preview":
                        selected_model = st.selectbox("Model", config["default_settings"]["private_preview_models"])
                    else:
                        fine_tuned_models = fetch_fine_tuned_models(session)
                        selected_model = st.selectbox("Model", fine_tuned_models)
                st.info("Use the same embedding type and model consistently when creating embeddings.")
                col4, col5 = st.columns(2)
                with col4:
                    embeddings = list(config["default_settings"]["embeddings"].keys())
                    embedding_type = st.selectbox("Embeddings", embeddings[1:])
                with col5:
                    embedding_model = st.selectbox("Embedding Model", config["default_settings"]["embeddings"][embedding_type])

            # Chat container
            rag_chat_container = st.container(border=True, height=700)
            with rag_chat_container:
                st.subheader("Chat Messages")
                for message in st.session_state.get("messages", []):
                    with st.chat_message(message["role"]):
                        st.markdown(message["content"])
            
            rag = st.checkbox("Use your own documents as context?", value=True)
            if question := st.chat_input("Enter your question"):
                st.session_state.messages.append({"role": "user", "content": question})
                with rag_chat_container: 
                    with st.chat_message("user"):
                        st.markdown(question)
                try:
                    def get_chat_history():
                        start_index = max(0, len(st.session_state.cortex_chat) - slide_window)
                        filtered_history = [
                            msg for msg in st.session_state.messages[start_index:]
                            if not msg["content"].startswith("An error occurred") 
                        ]
                        return filtered_history
                    
                    chat_history = get_chat_history()

                    prompt = create_prompt_for_rag(session, question, rag, selected_column, selected_db, selected_schema, selected_table,embedding_type,embedding_model, chat_history)
                    if prompt:
                        prompt = prompt.replace("'", "\\'")
                    result = execute_query_and_get_result(session, prompt, selected_model, "Generate RAG Response")
                    result_json = json.loads(result)
                    response = result_json.get("choices", [{}])[0].get("messages", "No messages found")
                    st.session_state.messages.append({"role": "assistant", "content": response})
                    with rag_chat_container:
                        with st.chat_message("assistant"):
                            st.markdown(response)
                except Exception as e:
                    add_log_entry(session, "Generate RAG Response", str(e))
                    st.error("An error occurred :  Check if same embedding type and model are selected. Please check the logs for details.")

        elif options == "Cortex Agent":
            st.subheader("Chat with Agent")
            agent_manager = CortexAgentManager(session)
            agents = agent_manager.get_all_agents()
            chat_agent_name = st.selectbox("Agent", [agent.name for agent in agents], key="chat_agent_name")
            if chat_agent_name:
                agent = next(a for a in agents if a.name == chat_agent_name)
                question = st.text_input("Ask a question", placeholder="Type your question here...", key="question")

                if st.button("Send", key="send"):
                    if question.strip():
                        with st.spinner("Processing your request..."):
                            text, sql = agent.chat(session, question)
                            if text:
                                with st.chat_message("assistant"):
                                    st.markdown(text.replace("•", "\n\n").replace("【†", "[").replace("†】", "]"))  # Format bullet points
                                st.session_state.setdefault("messages", []).append({"role": "assistant", "content": text})
                            if sql:
                                st.markdown("### Generated SQL")
                                st.code(sql, language="sql")
                                sql_result = run_snowflake_query(session, sql)
                                st.write("### Query Results")
                                st.dataframe(sql_result)
                    else:
                        st.error("Question cannot be empty")

