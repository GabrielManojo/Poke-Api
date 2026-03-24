// ErrorState is a tiny fallback view used when API data cannot be loaded.
function ErrorState({ message }) {
  return (
    // Keep the same shell/background so the error still fits the app layout.
    <main className="app-shell py-5">
      <div className="container">
        {/* role="alert" makes assistive tech announce this message immediately. */}
        <div className="alert alert-danger mb-0" role="alert">
          {message}
        </div>
      </div>
    </main>
  );
}

// Export so App.jsx can render this when a fatal fetch error happens.
export default ErrorState;
