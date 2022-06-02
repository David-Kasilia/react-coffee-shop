// My imports.
import { checkIfUserExists, connectToDatabase } from '../../../utils/db/db-util';
import { hashPassword } from '../../../utils/auth/auth';
import { userDataIsValid } from '../../../utils/db/input-validation';

// URI address to connect to the MongoDB client.
const uri = `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.CLUSTER_NAME}.hsycr.mongodb.net/${process.env.USER_DB}?${process.env.OPTIONS}`;

export default async function handler(req, res) {
  console.count('SIGNUP API');
  if (req.method === 'POST') {
    const data = req.body;

    const { email, password, firstName, lastName } = data; // Get the user input.
    console.log(firstName, lastName);

    // Backend Validation: Validate user input.
    const invalidUserMessage = userDataIsValid({ firstName, lastName, email });
    if (invalidUserMessage !== '') {
      // Validate user name and email.
      res.status(422).json({ message: invalidUserMessage });
      return;
    }
    if (!password || password.trim().length < 7) {
      // Validate user password.
      res.status(422).json({ message: 'Invalid password entered. Password must be at least 7 characters long.' });
      return;
    }

    // Connect to the user database.
    let client;
    try {
      client = await connectToDatabase(uri);
    } catch (error) {
      res.status(500).json({ message: 'Connecting to the cart database failed!' });
      return;
    }
    const db = client.db();

    // Check if user already exists.
    const userExists = await checkIfUserExists(email);
    console.log(userExists);
    if (userExists) {
      // User found therefore an account already exists.
      res.status(401).json({ message: 'You already have an account. Click below to sign in.' });
      client.close();
      return;
    }

    // Hash the user's password to store in our server.
    const hashedPassword = await hashPassword(password);

    // Add the new user and its credentials to our database.
    const result = await db.collection(process.env.USER_COLLECTION).insertOne({
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: hashedPassword, // DO NOT STORE PLAIN PASSWORDS in database, must be encrypted.
    });

    if (!result.acknowledged) {
      res.status(500).json({ message: 'Failed to create new user.' });
      client.close();
      return;
    }

    res.status(201).json({ message: 'Created new user!' });
    client.close();
  }
}
