MaalSaathi 🚀

AI-powered WhatsApp automation and chatbot project built using Node.js, Express, MongoDB Atlas, and whatsapp-web.js.

⸻

Features

✅ WhatsApp bot connection using QR code
✅ Auto replies
✅ Dynamic username replies
✅ MongoDB Atlas integration
✅ Express backend server
✅ Environment variables using .env
✅ Command-based chatbot system
✅ Real-time message listening
✅ LocalAuth session support

⸻

Tech Stack

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* whatsapp-web.js
* qrcode-terminal
* dotenv
* nodemon

⸻

Project Structure

MaalSaathi/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── src/
│   │   ├── index.js
│   │   └── whatsapp.js
│   ├── utils/
│   ├── .env
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
├── database/
├── docs/
└── README.md

⸻

Installation

1. Clone Repository

git clone <your-repo-link>

⸻

2. Open Backend Folder

cd backend

⸻

3. Install Dependencies

npm install

⸻

Required Packages

npm install express mongoose dotenv nodemon whatsapp-web.js qrcode-terminal

⸻

MongoDB Setup

Create a .env file inside backend folder.

Example:

MONGO_URI=your_mongodb_connection_string

⸻

Run Project

npm run dev

⸻

WhatsApp Bot Commands

Command	Reply
hi	Greeting message
help	Command list
price	Price response
bye	Goodbye message

⸻

Current Status

✅ MongoDB Connected
✅ WhatsApp Connected
✅ Auto Reply Working
✅ Dynamic Name Replies Working
✅ QR Authentication Working

⸻

Future Goals

* OpenAI/Gemini integration
* AI conversational chatbot
* Chat history storage
* User management system
* Cloud deployment
* SaaS architecture
* Multi-user support
* Admin dashboard
* Analytics system

⸻

Git Push Guide

Initialize Git

git init

⸻

Add Files

git add .

⸻

Commit

git commit -m "Initial commit - MaalSaathi bot setup"

⸻

Connect GitHub Repo

git remote add origin <your-github-repo-link>

⸻

Push Code

git push -u origin main

⸻

Important Security Note ⚠️

Never upload:

* .env
* MongoDB password
* WhatsApp session files
* API keys

Create .gitignore file:

node_modules
.env
.wwebjs_auth

⸻

Author

Rahul Yadav

Project: MaalSaathi 🚀
