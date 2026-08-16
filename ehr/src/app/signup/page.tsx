import { redirect } from 'next/navigation';

export default function SignUpPage() {
  // Redirect to the existing register page
  redirect('/register');
}
