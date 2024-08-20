var express = require('express');
var app = express();
var db = require('./config/db');
var userRoutes = require('./components/user/userRoute');

app.use(express.static('public')); // Serve static files from the public directory

// Connect to the database
db.connect(function(err) {
    if (err) {
        console.error('Failed to connect to SQL: ' + err.stack);
        return;
    }
    console.log('Connected to SQL successfully');
});


app.use('/api', userRoutes); 

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/../public/'); 
});

app.listen(3000, function() {
    console.log('Server is running on port 3000');
});