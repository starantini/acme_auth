const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const jwt = require("jsonwebtoken");
const JWT_SECRET = ".env";
const config = {
  logging: false,
};
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

process.env.JWT_SECRET;

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.byToken = async (token) => {
  console.log(token);
  if (token) {
    try {
      // console.log(token);
      // console.log(JWT_SECRET);
      const id = jwt.verify(token, JWT_SECRET);
      // console.log(id);
      const user = await User.findByPk(id.userId);
      // console.log(id);
      if (user) {
        // console.log(user);
        return user;
      }
      const error = Error("bad credentials");
      error.status = 401;
      throw error;
    } catch (ex) {
      const error = Error("bad credentials");
      error.status = 401;
      throw error;
    }
  }
};

User.authenticate = async ({ username, password }) => {
  // console.log(username, password);
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (!user) {
    console.log(user);

    return "401";
  }
  const compare = await user.checkPassword(password);
  if (!compare) {
    return "Passwords no match";
  }
  // console.log(compare);

  return jwt.sign({ userId: user.id }, JWT_SECRET);

  //   const error = Error("bad credentials");
  //   error.status = 401;
  //   throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const notes = [
    {
      text: "Text 1 sldjflksjdfljsldjflsdjf",
      userId: 2,
    },
    {
      text: "Text 2 sldjflksjdfljsldjflsdjf",
      userId: 2,
    },
    {
      text: "Text 3 sldjflksjdfljsldjflsdjf",
      userId: 1,
    },
  ];

  const [text] = await Promise.all(notes.map((note) => Note.create(note)));

  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
      text,
    },
  };
};

User.beforeCreate(async (user) => {
  // console.log(user);
  const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
  user.password = hashedPassword;
});

User.prototype.checkPassword = async function (plainText) {
  return await bcrypt.compare(plainText, this.password);
};

User.hasMany(Note);
Note.belongsTo(User);

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
