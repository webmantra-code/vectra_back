const sql = require('mssql');
const pool = require('../config/msdb');
const Joi = require('joi');

// Define the validation schema using Joi with lowercase field names
const contactSchema = Joi.object({
  fullname: Joi.string().min(1).max(50).required(),
  companyname: Joi.string().min(1).max(50).required(),
  industry: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().required(),
  countrycode: Joi.string().pattern(/^\+\d{1,3}$/).required(),
  phonenumber: Joi.string().pattern(/^\d+$/).required(),
  notes: Joi.string().min(1).required(),
  option1: Joi.boolean().valid(true).required(),  // Assuming this is a checkbox or similar field for validation
});

// Controller function to handle contact form submissions
const submitContactForm = async (req, res) => {
  // Validate incoming data
  const { error, value } = contactSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const {
    fullname,
    companyname,
    industry,
    email,
    countrycode,
    phonenumber,
    notes
  } = value;

  let conn;
  try {
    // Establish a connection from the pool
    conn = await pool.getConnection();

    // Construct the query with parameter placeholders
    const queryAdd = `
      INSERT INTO contacts (fullname, companyname, industry, email, countrycode, phonenumber, notes, createdat)
      VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())
    `;

    // Execute the query using conn.query with an array of parameters
    await conn.query(queryAdd, [
      fullname,
      companyname,
      industry,
      email,
      countrycode,
      phonenumber,
      notes
    ]);

    // Respond with success
    res.status(200).json({ message: 'Form submitted successfully' });
  } catch (err) {
    console.error('Error inserting data:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    // Ensure the connection is closed
    // conn.close();
  }
};

module.exports = {
  submitContactForm,
};
