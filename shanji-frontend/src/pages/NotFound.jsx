import { Link, useLocation } from "react-router-dom"

// Used for unknown URLs and for sidebar destinations that are not built yet.
function NotFound({ notImplemented }) {
  const { pathname } = useLocation()
  return (
    <div>
      <h1>{notImplemented ? "Not implemented yet" : "Page not found"}</h1>
      <p>
        {notImplemented
          ? `The module at ${pathname} has not been built yet.`
          : `No page exists at ${pathname}.`}
      </p>
      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  )
}

export default NotFound
