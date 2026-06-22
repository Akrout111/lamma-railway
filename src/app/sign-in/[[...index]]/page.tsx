import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'bg-paper shadow-lg rounded-2xl border border-stone/20',
            headerTitle: 'font-display text-2xl',
            headerSubtitle: 'text-stone',
            formButtonPrimary:
              'bg-clay hover:bg-clay/90 text-paper text-sm font-medium rounded-lg',
            formFieldInput:
              'rounded-lg border border-stone/30 bg-paper focus:border-clay focus:ring-clay',
            footerActionLink: 'text-clay hover:underline',
          },
        }}
      />
    </div>
  );
}
