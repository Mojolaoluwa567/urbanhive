<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {

  // Change this to your email address
  $to = "youremail@example.com";  
  $subject = "New Contact Form Submission";

  // Collect form data
  $inquiry_type = $_POST['inquiry_type'];
  $user_type = $_POST['user_type'];
  $fullname = $_POST['fullname'];
  $email = $_POST['email'];
  $organization = $_POST['organization'];
  $phone = $_POST['phone'];
  $message = $_POST['message'];

  // Create the email body
  $body = "
  📨 New Contact Form Submission

  Inquiry Type: $inquiry_type
  User Type: $user_type
  Full Name: $fullname
  Email: $email
  Organization: $organization
  Phone: $phone

  Message:
  $message
  ";

  // Email headers
  $headers = "From: $fullname <$email>\r\n";
  $headers .= "Reply-To: $email\r\n";

  // Send the email
  if (mail($to, $subject, $body, $headers)) {
    echo "<h3>✅ Message sent successfully. We'll get back to you soon!</h3>";
  } else {
    echo "<h3>❌ There was an issue sending your message. Please try again later.</h3>";
  }
}
?>
