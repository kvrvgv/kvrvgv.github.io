let tg = window.Telegram.WebApp;

tg.expand();

tg.MainButton.textColor = "#FFFFFF";
tg.MainButton.color = "#2cab37";

let item = "";

let input1 = document.getElementsByTagName("input")[0]

input1.addEventListener("input", function(){
	item = this.value
	tg.MainButton.hide();
    tg.MainButton.setText("Установить громкость: " + item + "%");
    tg.MainButton.show();
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

let block_btn = document.getElementById("block_user_btn");

block_btn.addEventListener("click", function(){
    item = "block_computer";
    tg.MainButton.hide();
    tg.MainButton.setText("Выполнить: Блокировка компьютера");
    tg.MainButton.show();
});

let off_comp_btn = document.getElementById("off_computer_btn");

off_comp_btn.addEventListener("click", function(){
    item = "off_computer";
    tg.MainButton.hide();
    tg.MainButton.setText("Выполнить: Выключение компьютера");
    tg.MainButton.show();
});

Telegram.WebApp.onEvent("mainButtonClicked", function(){
    tg.sendData(item);
});
