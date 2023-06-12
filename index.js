const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const otpGenerator = require('otp-generator')
const nodemailer = require('nodemailer')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

mongoose.connect('mongodb+srv://karthikgeek1:karthik@cluster0.myxw1c1.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('db connected')
})

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    otp: String
})

const User = mongoose.model("User", UserSchema)

app.get('/', (req,res)=>{
    res.send('hii')
})

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    User.findOne({ email: email }).then(async (savedUser) => {
        if (savedUser) {
            res.status(422).send({ error: "user exists" })
        }
        else {
            const user = new User({
                name,
                email,
                password,
                otp: null
            })
            user.save()
        }
    })
})

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    User.findOne({ email: email }).then(async (savedUser) => {
        if (email == savedUser.email && password == savedUser.password) {
            res.status(200).send({ message: 'success' })
        }
        else {
            res.status(422).send({ error: 'error' })
        }
    })

})

const postSchema = new mongoose.Schema({
    name: String,
    description: String,
    url: String
});

const Post = mongoose.model('posts', postSchema);

app.post('/posts', (req, res) => {
    const { name, url, description } = req.body;
    if (name && url && description) {
        const post = new Post({
            name,
            url,
            description
        });
        post.save().then(() => {
            res.status(200).send({ message: 'success' });
        }).catch((error) => {
            console.log(error);
            res.status(500).send({ message: 'Server error' });
        });
    } else {
        res.status(422).send({ message: 'error' });
    }
});


app.get('/posts', (req, res) => {
    Post.find().then((posts) => {
        console.log(res.json(posts))
    }).catch((err) => {
        console.log(err)
        res.status(500).send('Server error')
    })
})
app.delete('/posts/:postId', (req, res) => {
    const postId = req.params.postId;
    Post.findByIdAndDelete(postId)
        .then(() => {
            res.status(200).send({ message: 'Post deleted successfully' });
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send({ message: 'Server error' });
        });
});
app.post('/forgot', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    console.log('transporter')
    if (!user) {
        return res.status(404).send({ error: 'User not found' });
    }
    const otp = otpGenerator.generate(6, { digits: true, upperCase: false, lowerCase: false, specialChars: false, lowerCaseAlphabets: false, upperCaseAlphabets: false });
    user.otp = otp;
    await user.save();

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'karthikgeek1@gmail.com',
            pass: 'cxswmmxcixamobga'
        }
    });

    const mailOptions = {
        from: 'karthikgeek1@gmail.com',
        to: email,
        subject: 'Forgot Password - Verification Code',
        html: `<p>Your verification code is <strong>${otp}</strong></p>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            return res.status(500).send({ error: 'Unable to send email' });
        } else {
            console.log('Email sent: ' + info.response);
            return res.status(200).send({ message: 'OTP sent successfully' });
        }
    });
})

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).send({ error: 'User not found' });
    }
    if (user.otp !== otp) {
        return res.status(422).send({ error: 'Invalid OTP' });
    }
    user.otp = null;
    await user.save();
    return res.status(200).send({ message: 'OTP verified successfully' });
})

app.listen(9000, () => {
    console.log('server started')
})