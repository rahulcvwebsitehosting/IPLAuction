const mongoose = require("mongoose");
const { Schema } = mongoose;
// bcryptjs is a pure-JavaScript implementation with the same API as the
// native bcrypt. The native module ships prebuilt binaries that don't load
// on some Node versions (ERR_DLOPEN_FAILED), crashing the app on startup.
// bcryptjs avoids all native-compilation issues.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// User Schema
const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      dropDups: true,
    },

    password: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      dropDups: true,
    },
    tokens: [
      {
        token: {
          type: String,
        },
      },
    ],
    auctions: [],
  },
  {
    timestamps: true,
  }
);

/*
Below code runs before the user is saved. 
It hashes the password if the password is changed. 
*/
UserSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) {
    next();
    return;
  }
  user.password = await bcrypt.hash(user.password, 8);
  next();
});

// Generates a json web token
UserSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ id: user._id }, process.env.SECRET, {
    expiresIn: "7d",
  });
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// Generates a profile by removing sensitive information
UserSchema.methods.getPublicProfile = function () {
  const user = this.toObject();
  delete user["password"];
  delete user["tokens"];
  return user;
};

UserSchema.statics.findByCredentials = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(
      "Sorry the credentials you entered do not match. Please try again."
    );
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error(
      "Sorry the credentials you entered do not match. Please try again."
    );
  }
  return user;
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
