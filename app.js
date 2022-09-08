let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = "#FFFFFF";
tg.MainButton.color = "#2cab37";

let item = "";

let input1 = document.getElementsByTagName("input")[0]

input1.addEventListener("input", function(){
	if (!(tg.MainButton.isVisible)) {
        tg.MainButton.show();
	}
	item = this.value
    tg.MainButton.setText("Громкость: " + item + "%");
    if (item == 0) {
        input1.className = "slider muted"
    } else {
        if (item > 0 && item <= 33) {
            input1.className = "slider low"
        } else {
            if (item > 33 && item <= 70) {
                input1.className = "slider middle"
            } else {
                input1.className = "slider loud"
            }
        }
    }
});

Telegram.WebApp.onEvent("mainButtonClicked", function(){
    tg.sendData(item);
});

let usercard = document.getElementById("usercard");

let p = document.createElement("p");

p.innerText = `${tg.initDataUnsafe.user.first_name}
${tg.initDataUnsafe.user.last_name}`;


usercard.appendChild(p);
