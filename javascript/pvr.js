
function BookClick(){
    document.getElementById("btnContainer").style.display = "none";
    document.getElementById("summaryContainer").style.display = "block";


    movieName = document.getElementById("lstMovies").value;
    document.getElementById("lblMovie").textContent = movieName;

    if(movieName === "Mission Impossible"){
        document.getElementById("imgPoster").src="./public/Peddy.jpeg";
    }else{
         document.getElementById("imgPoster").src="./public/photo.jpeg";
    }


    document.getElementById("lblDate").textContent = document.getElementById("lstDate").value;
    document.getElementById("lblCinema").textContent = document.getElementById("lstCinema").value;
    document.getElementById("lblTiming").textContent = document.getElementById("lstTiming").value;
}

function EditClick(){
    document.getElementById("lblTitle").textContent = "Modify Booking";
    document.getElementById("btnBook").innerHTML = "Save";
    document.getElementById("btnBook").className = "btn btn-success";
}