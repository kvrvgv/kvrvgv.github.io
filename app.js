

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function main() {
    let title_elem = document.getElementById("title");

    let name = "kvrvgv";

    for (let i = 0; i < name.length; i++){
        for (let j = 0; j < 25; j++){
            await sleep(25).then(() => {
                title_elem.innerHTML = title_elem.innerHTML.slice(0, -1);
                title_elem.innerHTML += (Math.random() + 1).toString(36).split("").pop();
            })
        }
        title_elem.innerHTML = title_elem.innerHTML.slice(0, -1);
        title_elem.innerHTML += name[i] + " ";
    }
    title_elem.innerHTML = title_elem.innerHTML.slice(0, -1);
}

main();

let c = document.getElementById("c");
let ctx = c.getContext("2d");

c.height = window.innerHeight;
c.width = window.innerWidth;

let matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%";
matrix = matrix.split("");

let font_size = 10;
let columns = c.width / font_size;
let drops = [];
for (let x = 0; x < columns; x++)
    drops[x] = 1;

function draw() {
    let now = new Date();
    let hour = now.getHours();
    let color = "#0F0";
    if (hour > 6 && hour < 18)
        color = "#FF0";

    ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.fillStyle = color;
    ctx.font = font_size + "px arial";
    for (let i = 0; i < drops.length; i++) {
        let text = matrix[Math.floor(Math.random() * matrix.length)];
        ctx.fillText(text, i * font_size, drops[i] * font_size);

        if (drops[i] * font_size > c.height && Math.random() > 0.975)
            drops[i] = 0;

        drops[i]++;
    }
}
setInterval(draw, 32);

function blinking(){
    let content_elem = document.getElementById("content");
    if (Math.random() > 0.5){
        let a = Math.random();
        let r = Math.random() * 16;
        let g = Math.random() * 64;
        let b = Math.random() * 16;
        content_elem.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
    } else {
        let a = Math.random() + 0.5;
        let r = Math.random() * 64;
        let g = Math.random() * 255 / 2 + 127;
        let b = Math.random() * 64;
        let color = `rgba(${r}, ${g}, ${b}, ${a})`;
        content_elem.style.color = color;
        let hrefs = document.getElementsByClassName("l");
        for (let i = 0; i < hrefs.length; i++)
            hrefs[i].style.color = color;
    }
}

setInterval(blinking, 128)