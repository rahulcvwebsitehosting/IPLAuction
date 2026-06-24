# Ipl-Auction

[![Website shields.io](https://img.shields.io/website-up-down-green-red/http/shields.io.svg)](https://ipl-mega-auction.herokuapp.com/)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/67f92738bcce4a2c83e2b0885e3bf649)](https://www.codacy.com/gh/Coder-Srinivas/Ipl-Auction/dashboard?utm_source=github.com&utm_medium=referral&utm_content=Coder-Srinivas/Ipl-Auction&utm_campaign=Badge_Grade)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

![Ipl-Auction](https://socialify.git.ci/Coder-Srinivas/Ipl-Auction/image?description=1&font=Source%20Code%20Pro&forks=1&language=1&owner=1&pattern=Circuit%20Board&stargazers=1&theme=Dark)

## Hit ⭐ if you like this project

<h2> Overview </h2>
 <ul>
  <li>
    <a href ='#tech-stack'> Tech Stack 👨‍💻</a>
  </li>
  <li>
   <a href ='#inspiration'> My Inspiration 💡</a>
  </li>
  <li>
   <a href ='#features'> What it does ✨</a>
  </li>
  <li>
     <a href ='#build'> How I built it 🐺</a>
  </li>
  <li> 
   <a href='#screenshots'>Screenshots 🖼️</a>
   </li>
   <li> 
   <a href='#play'>How to play 🎭</a>
   </li>
    <li> 
   <a href='#structure'>Project Structure 💪</a>
   </li>
  <li>
   <a href='#deployment'>Deployment 🚀</a>
  </li>
 </ul>
 
<h2 id='tech-stack'> Tech Stack 👨‍💻</h2>

<img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white"> <img src="https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white"> <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"> <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white"> <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white">
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB">

<h2 id='inspiration'> My Inspiration 💡</h2>

![YoureMyInspirationBrynnElliottGIF](https://user-images.githubusercontent.com/59244289/136423443-7dd54f9f-e9b7-45a4-a700-037558abd1a1.gif)

It began back during my childhood days, the urge to play the IPL Auction depicting real players. I used to team up with my friends and play the auction manually with a pen and paper, with a organizer to keep track. Over the last 1 year, I wondered, can I do anything to make my experience better? So I came up with the idea of building a IPL auction app, based on the MERN stack.

<h2 id='features'> What it does ✨</h2>

![AndThatsWhatItDoesDigibyteGIF](https://user-images.githubusercontent.com/59244289/136423729-777b2bb9-3d7c-4ec3-a9e3-742167451853.gif)

You can team up with your friends and dive into the fun world of auctioning IPL players. The application is capable of auctioning players belonging to various IPL Teams. The bid timer is reset with each bid and the time slot to buy a player is 10 seconds so be quick. It's a fun application to experience the the real IPL Auction with friends. Simply create an account, gather your friends and jump staright into the auction.

<h2 id='build'> How I built it 🐺</h2>

![HowItsMadeCuriousGIF](https://user-images.githubusercontent.com/59244289/136423987-f44902a6-a93b-423d-af6d-1d2c525bdfa4.gif)

- React is used on the client side.
- Node.js is used on the server side.
- The news is fetched from the RSS feed of Times of India.
- Puppeteer is used to scrape data from the IPLT20 Website.
- Socket.io is used to establish a full-duplex connection with the server and the client.
- **User accounts and finished-auction history are stored entirely in the
  browser** (localStorage/sessionStorage). Passwords are hashed with SHA-256
  before being saved. There is **no login page** — a single Sign Up form is
  the entry point, and it recognises returning users. This keeps the frontend
  fully deployable on Vercel with no auth backend. See `client/src/services/auth.service.js`.
- An auction object is created upon the creation of a new auction which stores the information of current auction.
- User class stores the information of the user and the players purchased by him/her.
- node-schedule is used to schedule the scraping process.
- Mongodb database is used to store the incomming data.

<h2 id='screenshots'>Screenshots 🖼️</h2>

<div align="center">
  <img width="45%" src="https://github.com/Coder-Srinivas/Ipl-Auction/blob/master/client/public/Images/Screenshot-1.png">
  <img width="45%" src="https://github.com/Coder-Srinivas/Ipl-Auction/blob/master/client/public/Images/Screenshot-2.png">
  <img width="45%" src="https://github.com/Coder-Srinivas/Ipl-Auction/blob/master/client/public/Images/Screenshot-3.png">
  <img width="45%" src="https://github.com/Coder-Srinivas/Ipl-Auction/blob/master/client/public/Images/Screenshot-4.png">
  <img width="45%" src="https://github.com/Coder-Srinivas/Ipl-Auction/blob/master/client/public/Images/Screenshot-5.png">
  <img width="45%" src="https://github.com/Coder-Srinivas/Ipl-Auction/blob/master/client/public/Images/Screenshot-6.png">
  <img width="45%" src="https://github.com/Coder-Srinivas/Ipl-Auction/blob/master/client/public/Images/Screenshot-7.png">
</div>

<h2 id='play'>How to play 🎭</h2>

![TypicalDayPaningningTheRealPaningningGIF](https://user-images.githubusercontent.com/59244289/136424082-80c3bbc0-5575-472b-a4e7-97942c4b10b5.gif)

- Login/Signup using your email address and password
- Create a new auction
- Share the generated code with your friends
- Bid on your favourite players
- Most important part is to enjoy

<h2 id='structure'>Project Structure 💪</h2>

    .
    │   .gitignore
    │   app.js
    │   package-lock.json
    │   package.json
    │   README.md
    │
    ├───.github
    │   └───workflows
    │           codeql-analysis.yml
    │
    ├───.husky
    │       pre-commit
    │
    ├───.vscode
    │       settings.json
    │
    ├───client
    │   │   .gitignore
    │   │   package-lock.json
    │   │   package.json
    │   │
    │   ├───public
    │   │   │   index.html
    │   │   │
    │   │   └───Images
    │   │           arrow.svg
    │   │           error.svg
    │   │           logo.png
    │   │           profile.jpeg
    │   │           Screenshot-1.png
    │   │           Screenshot-2.png
    │   │           Screenshot-3.png
    │   │           Screenshot-4.png
    │   │           Screenshot-5.png
    │   │           Screenshot-6.png
    │   │           Screenshot-7.png
    │   │
    │   └───src
    │       │   App.js
    │       │   index.js
    │       │
    │       ├───components
    │       │       AccordianComponent.js
    │       │       Bars.js
    │       │       CreateAuction.js
    │       │       Error.js
    │       │       Form.js
    │       │       Game.js
    │       │       Input.js
    │       │       JoinAuction.js
    │       │       Loading.component.js
    │       │       Lobby.js
    │       │       Navbar.js
    │       │       News.js
    │       │       NewsCard.js
    │       │       NewsContent.js
    │       │       NewsDate.js
    │       │       NewsDescription.js
    │       │       NewsImage.js
    │       │       NewsTitle.js
    │       │       PlayerCard.js
    │       │       PlayerStats.js
    │       │       Title.js
    │       │       UserAccordian.js
    │       │
    │       ├───hooks
    │       │       useFindUser.js
    │       │       UserContext.js
    │       │
    │       ├───pages
    │       │       About.js
    │       │       Auction.js
    │       │       Home.js
    │       │       Loading.js
    │       │       Login.js
    │       │       PreviousAuctions.js
    │       │       SignUp.js
    │       │
    │       ├───routes
    │       │       PrivateRoute.js
    │       │       PublicRoute.js
    │       │
    │       ├───sass
    │       │   │   main.scss
    │       │   │
    │       │   ├───base
    │       │   │       animations.scss
    │       │   │       reset.scss
    │       │   │
    │       │   ├───components
    │       │   │       bars.scss
    │       │   │       button.scss
    │       │   │       create-auction.scss
    │       │   │       error.scss
    │       │   │       form.scss
    │       │   │       games.scss
    │       │   │       loading.scss
    │       │   │       lobby.scss
    │       │   │       navbar.scss
    │       │   │       news.scss
    │       │   │       playerCard.scss
    │       │   │       title.scss
    │       │   │       user-accordian.scss
    │       │   │
    │       │   ├───pages
    │       │   │       about.scss
    │       │   │       auction.scss
    │       │   │       home.scss
    │       │   │       loading.scss
    │       │   │       previous-auction.scss
    │       │   │
    │       │   └───utilities
    │       │           classes.scss
    │       │           mixins.scss
    │       │           variables.scss
    │       │
    │       ├───services
    │       │       auction.service.js
    │       │       auth.service.js
    │       │       news.service.js
    │       │       players.service.js
    │       │       sockets.service.js
    │       │
    │       └───utilities
    │               axiosInstance.js
    │               handleChanges.js
    │               validation.js
    │
    ├───controller
    │       auction.js
    │       bidding.js
    │       game.js
    │       user.js
    │
    ├───data
    │       squads.json
    │
    ├───database
    │   │   connection.js
    │   │
    │   └───models
    │           user.model.js
    │
    ├───middleware
    │       auth.js
    │
    ├───routes
    │       auction.route.js
    │       news.route.js
    │       socket.route.js
    │       user.route.js
    │
    └───utilities
            players.js...

## Steps to get the project running locally on your machine

#### Setting Up Environment Variables

1. Create a .env file in the backend directory
2. Initialize DEV_MONGO_URL to mongodb://localhost:27017/
3. Initialize DEV_REACT_URL to http://localhost:3000
4. Initialize DEV_SERVER_URL to http://localhost:8000
5. Initialize SECRET to a JWT secret key

#### Installing the dependencies

Run the following command in the root
of the project to install the packages
on the server side:

```
npm i
```

Run the following command in the root
of the project to install the packages
on the client side:

```
cd client
npm i
```

#### Running the project

Run the following command in the root
to get the client side and the server
side running concurrently:

```
npm run dev
```

## Deployment 🚀

This is a **split deployment**: the React frontend runs on **Vercel**, while the
Node/Express backend (which needs WebSockets for the live auction, an in-memory
auction store, and Puppeteer for scraping) runs on **Render**.

> **MongoDB is now optional.** User accounts, auth, and finished-auction history
> are stored entirely in the browser (localStorage). The backend's only required
> jobs are the Socket.io auction server and (optionally) the `/news` feed. If you
> don't care about the legacy DB-backed routes, you can skip Step 1 and leave
> `PROD_MONGO_URL` unset — `database/connection.js` will log a connection error
> but the auction still runs.

> Why split? Vercel's serverless functions can't hold open WebSocket
> connections, can't keep in-memory state alive between requests, and can't run
> Puppeteer. The live multiplayer auction requires all three, so the backend
> lives on a long-lived host (Render) and only the static frontend ships to Vercel.

Deploy in this order: **(optional Database) → Backend → Frontend** (the frontend needs the
backend's URL as an environment variable).

---

### Step 1 — MongoDB Atlas (database) — *optional*

Only needed if you want the legacy DB-backed routes to work. Auth, sessions and
finished-auction history no longer use the database.

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
   and build a free **M0** cluster.
2. Under **Database Access**, add a user (username + password) — note these.
3. Under **Network Access**, allow `0.0.0.0/0` (so Render/Vercel can reach it).
4. Click **Connect → Drivers** and copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
   This is your **`PROD_MONGO_URL`**.

---

### Step 2 — Backend on Render

1. Push this repo to GitHub.
2. On [render.com](https://render.com): **New → Blueprint**, select this repo.
   Render reads [`render.yaml`](./render.yaml) and creates a **Web Service**
   (`npm start`, free plan).
3. In the service's **Environment**, set:
   - `CLIENT_URL` — `https://YOUR-FRONTEND.vercel.app` (from Step 3; you can
     set a placeholder now and edit it after Step 3)
   - `NODE_ENV` — `production` (already set by the blueprint)
   - `PROD_MONGO_URL` — *optional*, only if you did Step 1 and want the DB routes
   - `SECRET` — *optional* now (only the legacy JWT routes use it)
4. Deploy. Note the backend URL, e.g. `https://ipl-auction-backend.onrender.com`.

<details>
<summary><b>Alternative backend hosts</b></summary>

Render is recommended (has `render.yaml` one-click setup). Other WebSocket-capable
options that work the same way:

- **Railway** — `railway up`, set the same env vars, start command `npm start`.
- **Fly.io** — needs a Dockerfile; works but more setup.
- **A small VPS / DigitalOcean droplet** — `npm start` behind a reverse proxy
  (Caddy/Nginx) for TLS.

Avoid serverless-only platforms (plain Vercel functions, AWS Lambda, Cloudflare
Workers) for the backend — they don't support long-lived WebSockets.
</details>

---

### Step 3 — Frontend on Vercel

1. On [vercel.com](https://vercel.com): **Add New → Project**, import the same
   GitHub repo.
2. Set **Root Directory** to `client` (Vercel will auto-detect Create React App
   and use [`client/vercel.json`](./client/vercel.json)).
3. Add an environment variable:
   - `REACT_APP_API_URL` — your Render backend URL from Step 2, e.g.
     `https://ipl-auction-backend.onrender.com` (no trailing slash issues — the
     client code handles it).
4. Deploy. Copy the resulting Vercel URL.
5. **Go back to Render** and update `CLIENT_URL` to this Vercel URL, then redeploy
   the backend (this enables CORS + cookies for your frontend).

That's it — the auction is live. 🎉

---

### Notes on the production setup

- **Cookies**: the JWT cookie is `httpOnly`, `secure` (in production), and
  `sameSite=lax` so it travels correctly between the Vercel and Render origins.
- **Puppeteer**: launched with `--no-sandbox` etc. so Chromium runs inside
  Render's Linux container. If scraping ever fails, the app falls back to the
  bundled [`data/squads.json`](./data/squads.json).
- **Render free tier**: the backend sleeps after ~15 min of inactivity and takes
  ~30s to wake on the first request. Upgrade to a paid plan for an always-on
  service (recommended if you host a real game session).
- **Local dev** still works exactly as before: `npm run dev` from the root, with
  `DEV_MONGO_URL`, `SECRET`, and a local MongoDB running. See `.env.example`.

## Note

Keep the monogodb database running locally before running the application.
