const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const authRouter = require("./routes/auth");

const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: "secret",
        resave: false,
        saveUninitialized: true,
    })
);


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'js')));

app.use((req, res, next) => {
    if (!req.session.user && req.path !== '/auth/login' && req.path !== '/auth/register' && req.path !== '/auth/landing') {
        return res.redirect('/auth/landing');
    } else if (req.session.user && req.path === '/') {
        return res.redirect('/auth/profil');
    }
    next();
});


app.use("/auth", authRouter);

app.get("/", (req, res) => {
    if (req.session.user) {
        res.render("profil", { user: req.session.user });
    } else {    
        res.redirect("/auth/login");
    }
});

app.listen(8080, () => {
    console.log(`sever berjalan di http://localhost:8080`);
});