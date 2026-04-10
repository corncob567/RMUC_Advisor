import streamlit as st
from groq import Groq
import json

st.markdown("""
<style>

/* 🔥 FULL PAGE BACKGROUND (outside the card) */
html, body, [data-testid="stAppViewContainer"] {
    background: transparent !important;
}

/* Hide Streamlit chrome */
header, footer {
    visibility: hidden;
}

.stMainBlockContainer{
    background: #1a2b4a;
    border-radius: 20px;
    padding: 1em;
}

/* Fix inner spacing */
.main {
    padding: 0 !important;
}

/* Tabs container */
[data-baseweb="tab-list"] {
    gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.2);
}

/* All tabs */
[data-baseweb="tab"] {
    color: white !important;
    font-weight: 400;
    background: transparent !important;
    border: none !important;
}

/* 🔥 Active tab (selected) */
[data-baseweb="tab"][aria-selected="true"] {
    font-weight: 700 !important;
    color: white !important;
    border-bottom: 2px solid white !important;
}

/* Remove the ugly red underline indicator */
[data-baseweb="tab-highlight"] {
    background: transparent !important;
}

[data-baseweb="select"] div {
    color: black;
}

[data-testid="stChatInputTextArea"]{
    color: black;
}

.stChatInput div {
    background-color: #fff;
}

.st-ct{
    background-color: #fff;
}

.stTextInput input{
    color: black;
}

</style>
""", unsafe_allow_html=True)

# 1. Page Setup
st.set_page_config(page_title="RMUC Advisor", page_icon="🤖")
st.title("RMUC Advisor")
st.markdown("Your AI-powered guide to the Rent Manager User Conference in San Antonio!")

client = Groq(api_key=st.secrets["GROQ_KEY"]) # Necessary for production

# 2. Load Data from Files
@st.cache_data
def load_conference_data():
    with open("data/conference.txt", "r") as f:
        return f.read()

@st.cache_data
def load_attendees():
    with open("data/attendees.json", "r") as f:
        return json.load(f)

CONFERENCE_DATA = load_conference_data()
attendees = load_attendees()

# 3. Initialize chat histories with system messages ONCE
if "chat_messages" not in st.session_state:
    st.session_state.chat_messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful conference assistant for RMUC.26, the Rent Manager User Conference in San Antonio. "
                "Keep answers concise. Use this conference data ONLY to answer questions:\n"
                f"{CONFERENCE_DATA}"
            )
        }
    ]

if "match_messages" not in st.session_state:
    ATTENDEE_LIST_STR = "\n".join([
        f"- {a['name']} | Role: {a.get('role', 'N/A')} | Interests: {a['interests']} | Goal: {a['goal']}"
        for a in attendees
    ])
    st.session_state.match_messages = [
        {
            "role": "system",
            "content": (
                "You are a professional networking assistant at RMUC.26, the Rent Manager User Conference. "
                "Help attendees find meaningful connections. Be warm and encouraging. "
                "Always respond in concise bullet points. "
                "When ranking matches, include name, role, and a brief one-line reason. Only include, at most, the 3 matches."
                "Remember the user's details and previous matches across the conversation. "
                f"Here are all the attendees:\n{ATTENDEE_LIST_STR}"
            )
        }
    ]

# 4. Tabs
tab1, tab2 = st.tabs(["💬 Ask Advisor", "🤝 Find a Match"])

# TAB 1: Chat Assistant
with tab1:
    st.subheader("Ask about the Conference")

    container = st.container()

    if prompt := st.chat_input("Ex: Where is the keynote?", key="chat_input"):
        st.session_state.chat_messages.append({"role": "user", "content": prompt})

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=st.session_state.chat_messages
        )
        response = completion.choices[0].message.content
        st.session_state.chat_messages.append({"role": "assistant", "content": response})

    with container:
        for msg in st.session_state.chat_messages[1:]:
            st.chat_message(msg["role"]).write(msg["content"])

# TAB 2: AI Networking Matchmaker
with tab2:
    st.subheader("Attendee Matching")
    st.markdown("Tell RMUC Advisor about yourself and it will find your best matches!")

    container2 = st.container()

    # First-time inputs: only show if user hasn't introduced themselves yet
    if len(st.session_state.match_messages) == 1:
        user_interests = st.text_input("Your interests (e.g., Orion, Scripting, Metered Utilities):")
        user_goal = st.selectbox("What's your main goal?", [
            "Learning from others",
            "General networking",
            "Find collaboration partners",
            "Exploring business opportunities"
        ])

        if st.button("🔍 Find My Matches"):
            if user_interests:
                intro_visible = (
                f"My interests are: {user_interests}. "
                f"My goal is: {user_goal}."
                )
                intro_with_instruction = intro_visible + " Please find and rank my best matches from the attendee list."

                st.session_state.match_messages.append({"role": "user", "content": intro_with_instruction})

                with st.spinner("Finding your best matches..."):
                    completion = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=st.session_state.match_messages
                    )
                    match_response = completion.choices[0].message.content

                st.session_state.match_messages.append({"role": "assistant", "content": match_response})
                st.rerun()
            else:
                st.warning("Please enter at least your interests so we can find your matches.")

    else:
        if follow_up := st.chat_input("Ask a follow-up", key="match_input"):
            st.session_state.match_messages.append({"role": "user", "content": follow_up})

            with st.spinner("Thinking..."):
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=st.session_state.match_messages
                )
                follow_up_response = completion.choices[0].message.content

            st.session_state.match_messages.append({"role": "assistant", "content": follow_up_response})

        with container2:
            first_user_seen = False
            for msg in st.session_state.match_messages[1:]:
                if msg["role"] == "user" and not first_user_seen:
                    first_user_seen = True
                    visible = msg["content"].replace(" Please find and rank my best matches from the attendee list.", "")
                    st.chat_message("user").write(visible)
                else:
                    st.chat_message(msg["role"]).write(msg["content"])
               