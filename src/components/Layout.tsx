type LayoutProps = {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="app-shell">
      <div className="page">{children}</div>
    </div>
  )
}

