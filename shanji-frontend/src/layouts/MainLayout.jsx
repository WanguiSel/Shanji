import { Outlet, NavLink } from "react-router-dom"

function MainLayout(){

  const links = [
    {
      name: "Dashboard",
      path: "/dashboard"
    },
    {
      name: "Projects",
      path: "/projects"
    },
    {
      name: "Workplans",
      path: "/workplans"
    },
    {
      name: "Risks",
      path: "/risks"
    },
    {
      name: "Reports",
      path: "/reports"
    }
  ]


  return (

    <div style={styles.container}>


      <aside style={styles.sidebar}>

        <h2>
          Shanji<span style={styles.logoAccent}>DNA</span>
        </h2>

        <nav>

          {links.map(link => (

            <NavLink
              key={link.name}
              to={link.path}
              style={({isActive})=>({
                ...styles.link,
                ...(isActive ? styles.active : {})
              })}
            >

              {link.name}

            </NavLink>

          ))}

        </nav>


      </aside>



      <main style={styles.main}>

        <Outlet />

      </main>


    </div>

  )
}



const styles={

container:{
display:"flex",
minHeight:"100vh"
},


sidebar:{
width:"240px",
background:"#082C26",
color:"white",
padding:"25px"
},


logoAccent:{
color:"#F59E0B"
},


link:{
display:"block",
color:"white",
textDecoration:"none",
padding:"12px",
marginTop:"10px",
borderRadius:"8px"
},


active:{
background:"#F59E0B",
color:"#082C26"
},


main:{
flex:1,
padding:"30px"
}

}


export default MainLayout