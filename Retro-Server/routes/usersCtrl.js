 // Imports
 var bcrypt    = require('bcrypt');
 var jwtUtils  = require('../utils/jwt.utils');
 var models    = require('../models');
 const user    = require('../models/user');
 var asyncLib  = require('async');

 
// Constants
const EMAIL_REGEX     = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const PASSWORD_REGEX  = /^(?=.*\d).{4,8}$/;

// Routes
module.exports = {
    register: function(req, res) {
 
        // Params
        var email    = req.body.email;
        var username = req.body.username;
        var password = req.body.password;
        var bio      = req.body.bio;

        if (email == null || username == null || password == null) {
            return res.status(400).json({ 'error': 'missing parameters' });
        }
 
        //Verify pseudo lenght, mail regex, password etc...
 
        if (username.length >= 13 || username.length <= 4) {
            return res.status(400).json({ 'error': 'wrong username (must be length 5 - 12)' });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ 'error': 'email is not valid' });
        }
      
        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ 'error': 'password invalid (must length 4 - 8 and include 1 number at least)' });
        }
      



        models.User.findOne({
            attributes: ['email'],
            where: { email: email }
        })    
        .then(function(userFound) {
            if (!userFound) {
 
                bcrypt.hash(password, 5,function(err,bcryptedPassword){
                    var newUser = models.User.create({
                        email    : email,
                        username : username,
                        password : bcryptedPassword,
                        bio      : bio,  
                        isAdmin  : 0
                    })
                    .then(function(newUser) {
                        return res.status(201).json({
                            'userId':newUser.id
                        })
                    })
                    .catch(function(err) {
                        return res.status(500).json({'error':'cannot add user'});
                    });
                });
 
            }else {
                return res.status(409).json({'error':'user already exist'});
            }
        })
        .catch(function(err) {
            return res.status(500).json({'error': 'unable to verify user'});
        });
 
 
    },
    login: function(req, res) {
 
        // Params
        var email    = req.body.email;
        var password = req.body.password;
 
            if (email == null || password == null) {
                return res.status(400).json({ 'error': 'missing parameters' });
            }
 
          //Verify mail regex and  password 
 
        models.User.findOne({
            where: { email: email }
        })  
        .then(function(userFound) {
            if (userFound) {
 
                bcrypt.compare(password, userFound.password,function(errBycrypt,resBcrypt){
                   if(resBcrypt) {
                        return res.status(200).json({
                        'userId':userFound.id,
                        'token': jwtUtils.generateTokenForUser(userFound)
                    });
                    }else {
                        return res.status(403).json({"error":"invalid password"});
                    }
                }); 
                  
             }else {
                return res.status(404).json({'error':'user not exist in DB'});
            }
        })
        .catch(function(err) {
            return res.status(500).json({'error': 'unable to verify user'});
        });
    },
    getUserProfile: function(req, res) {
        // Getting auth header
        var headerAuth  = req.headers['authorization'];
        var userId      = jwtUtils.getUserId(headerAuth);
    
        if (userId < 0)
            return res.status(400).json({ 'error': 'wrong token' });

        models.User.findOne({
            attributes: [ 'id', 'email', 'username', 'bio' ],
            where: { id: userId }
        }).then(function(user) {
            if (user) {
              res.status(201).json(user);
            } else {
              res.status(404).json({ 'error': 'user not found' });
            }
        }).catch(function(err) {
            res.status(500).json({ 'error': 'cannot fetch user' });
        });

    
    },
    updateUserProfile: function(req, res) {
        // Getting auth header
        var headerAuth  = req.headers['authorization'];
        var userId      = jwtUtils.getUserId(headerAuth);
    
        // Params
        var bio = req.body.bio;
    
        asyncLib.waterfall([
          function(done) {
            models.User.findOne({
              attributes: ['id', 'bio'],
              where: { id: userId }
            }).then(function (userFound) {
              done(null, userFound);
            })
            .catch(function(err) {
              return res.status(500).json({ 'error': 'unable to verify user' });
            });
          },
          function(userFound, done) {
            if(userFound) {
              userFound.update({
                bio: (bio ? bio : userFound.bio)
              }).then(function() {
                done(userFound);
              }).catch(function(err) {
                res.status(500).json({ 'error': 'cannot update user' });
              });
            } else {
              res.status(404).json({ 'error': 'user not found' });
            }
          },
        ], function(userFound) {
          if (userFound) {
            return res.status(201).json(userFound);
          } else {
            return res.status(500).json({ 'error': 'cannot update user profile' });
          }
        });
    },
    deleteUserProfile: function(req, res) {
        // Getting auth header
        var headerAuth = req.headers['authorization'];
        var userId = jwtUtils.getUserId(headerAuth);
      
        if (userId < 0)
          return res.status(400).json({ 'error': 'wrong token' });
      
        models.User.destroy({
          where: { id: userId }
        })
        .then(function(user) {
          if (user) {
            return res.status(201).json({ 'message': 'User profile deleted successfully' });
          } else {
            return res.status(404).json({ 'error': 'user not found' });
          }
        })
        .catch(function(err) {
          res.status(500).json({ 'error': 'cannot delete user profile' });
        });
      }
      
 }