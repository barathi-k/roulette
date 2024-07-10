/**
 * Prize data will space out evenly on the deal wheel based on the amount of items available.
 * @param text [string] name of the prize
 * @param color [string] background color of the prize
 */
let prizes = [];

let selectedParticipant;

const params = new URLSearchParams(document.location.search);
let speakerViewList;

const colors = [
    (params.get("color1") && `#${params.get("color1")}`) || "hsl(197 30% 43%)",
    (params.get("color2") && `#${params.get("color2")}`) || "hsl(173 58% 39%)",
    (params.get("color3") && `#${params.get("color3")}`) || "hsl(43 74% 66%)",
    (params.get("color4") && `#${params.get("color4")}`) || "hsl(27 87% 67%)",
    (params.get("color5") && `#${params.get("color5")}`) || "hsl(12 76% 61%)",
    (params.get("color6") && `#${params.get("color6")}`) || "hsl(350 60% 52%)",
    (params.get("color7") && `#${params.get("color7")}`) || "hsl(91 43% 54%)",
    (params.get("color8") && `#${params.get("color8")}`) || "hsl(140 36% 74%)",
];

const names = params.get("names")?.split(",").map(name => name.replace(/^ /, ''))

const isRaisingHand = params.get("hands") !== null

let initialTimeStamp;
let lastTimeRoulleteSpinned;
let lastTimeRoulleteSpinnedRandomly;
let didAlreadySpin = false;

function shuffle(array) {
    let currentIndex = array.length,
        randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }

    return array;
}

const start = async () => {
    let lastData;

    if (names) {
        prizes = names.map((name, i) => {
            return {
                text: name,
                color: colors[i & (colors.length - 1)],
            };
        });
    } else {
        prizes = await fetch("http://localhost:3900/state")
            .then((response) => response.json())
            .then((data) => {
                lastData = data;
                let rouletteList = Object.values(data?.attendeesByName)
                    .filter(
                        (attendee) =>
                            !attendee.isHost && !attendee.isCoHost && attendee.isVideoOn
                    )
                    .filter(
                        (attendee) => {
                            if (isRaisingHand) {
                                return !attendee.isHost && !attendee.isCoHost && attendee.isRaisingHand
                            }
                            return attendee
                        }
                    )
                    .filter((attendee) => attendee.userName !== data?.speakerViewList?.[0])
                    .map((attendee, i) => {
                        return {
                            text: attendee.userName,
                            color: colors[i & (colors.length - 1)],
                        };
                    });

                return rouletteList;
            });
    }

    prizes = prizes.slice(0, params.get("max") || 1000);

    const forcedPosition = Math.floor((prizes.length - 1) * 0.6);
    const speakerViewList = lastData?.speakerViewList;

    if (speakerViewList?.[0] && !speakerViewList[0].isCoHost && prizes[forcedPosition]?.text) {
        //prizes[forcedPosition].text = speakerViewList[0];
    } else {
        didAlreadySpin = true
    }

    const wheel = document.querySelector(".deal-wheel");
    const spinner = wheel.querySelector(".spinner");
    const ticker = wheel.querySelector(".ticker");
    const spinnerWrapper = wheel.querySelector(".has-not-spinned")
    const prizeSlice = 360 / prizes.length;
    const prizeOffset = Math.floor(180 / prizes.length);
    const spinClass = "is-spinning";
    const hasNotSpinnedClass = "has-not-spinned"
    const selectedClass = "selected";
    const spinnerStyles = window.getComputedStyle(spinner);
    let tickerAnim;
    let rotation = 0;
    let currentSlice = 0;
    let prizeNodes;

    const createPrizeNodes = () => {
        prizes.forEach(({ text, color }, i) => {
            const rotation = prizeSlice * i * -1 - prizeOffset;

            spinner.insertAdjacentHTML(
                "beforeend",
                `<li class="prize" style="--rotate: ${rotation}deg;">
        <span class="text">${text/*.split(" ")[0]*/}</span>
        </li>`
            );
        });
    };

    const createConicGradient = () => {
        spinner.setAttribute(
            "style",
            `background: conic-gradient(
      from -90deg,
      ${prizes
                .map(
                    ({ color }, i) =>
                        `${color} 0 ${(100 / prizes.length) * (prizes.length - i)}%`
                )
                .reverse()}
          );`
        );
    };

    const setupWheel = async () => {
        createConicGradient();
        createPrizeNodes();

        const spinner = document.querySelector(".spinner")
        if (prizes.length > 10 && prizes.length < 20) {
            spinner.classList.add("less-than-20")
        } else if (prizes.length < 30) {
            spinner.classList.add("less-than-30")
        } else if (prizes.length < 40) {
            spinner.classList.add("less-than-40")
        } else if (prizes.length < 50) {
            spinner.classList.add("less-than-50")
        } else if (prizes.length < 60) {
            spinner.classList.add("less-than-60")
        } else if (prizes.length >= 60) {
            spinner.classList.add("more-than-60")
        }

        prizeNodes = wheel.querySelectorAll(".prize");

        if (params.get("spin") !== null) {
            setTimeout(() => {
                spin();
            }, 100)
        }
    };

    const spinertia = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const runTickerAnimation = () => {
        // https://css-tricks.com/get-value-of-css-rotation-through-javascript/
        const values = spinnerStyles.transform
            .split("(")[1]
            .split(")")[0]
            .split(",");
        const a = values[0];
        const b = values[1];
        let rad = Math.atan2(b, a);

        if (rad < 0) rad += 2 * Math.PI;

        const angle = Math.round(rad * (180 / Math.PI));
        const slice = Math.floor(angle / prizeSlice);

        if (currentSlice !== slice) {
            ticker.style.animation = "none";
            setTimeout(() => (ticker.style.animation = null), 10);
            currentSlice = slice;

            // Play the click sound
            var clickSound = document.getElementById('clickSound');
            clickSound.play();
        }

        tickerAnim = requestAnimationFrame(runTickerAnimation);
    };

    const selectPrize = () => {
        const selected = Math.floor(rotation / prizeSlice);

        prizeNodes[selected].classList.add(selectedClass);
    };

    const spin = (option) => {
        if (selectedParticipant) {
            // Extract the names from the prizes list
            let names = prizes
                .map(prize => prize.text)
                .filter(text => text !== selectedParticipant)
                .join(',')

            // Get the current URL
            let currentUrl = window.location.href;

            // Create a URL object
            let url = new URL(currentUrl);

            // Add or update the 'names' query parameter
            url.searchParams.set('names', names);

            // Redirect to the new URL
            window.location.href = `${url.toString()}&spin`;
            return
        }

        var drumSound = document.getElementById('drumSound');
        drumSound.play();
        setTimeout(() => {
            confetti({
                particleCount: 300,
                spread: 90,
                origin: { y: 0.7, x: 0.4 }
            });
            var tadaSound = document.getElementById('tadaSound');
            tadaSound.play();
        }, 8400)

        if (option === "force" && didAlreadySpin) {
            return;
        }

        if (option === "force") {
            didAlreadySpin = true;
            rotation =
                prizeSlice * (forcedPosition + prizes.length * 5) +
                Math.floor(prizeSlice / 4);
        } else {
            rotation = Math.floor(Math.random() * 360 + spinertia(2000, 5000));
        }

        prizeNodes.forEach((prize) => prize.classList.remove(selectedClass));
        wheel.classList.add(spinClass);

        // Stop slowly spinning
        setTimeout(() => {
            spinnerWrapper.classList.remove(hasNotSpinnedClass)
        }, 500)

        spinner.style.setProperty("--rotate", rotation);
        ticker.style.animation = "none";
        runTickerAnimation();

        const futureRotation = (rotation %= 360);
        const selected = Math.floor(futureRotation / prizeSlice);
        selectedParticipant = prizes?.[selected]?.text;
    };

    setInterval(() => {
        let newLastTimeRoulleteSpinned;
        let newLastTimeRoulleteSpinnedRandomly;

        fetch("http://localhost:3900/state")
            .then((response) => response.json())
            .then((data) => {
                newLastTimeRoulleteSpinned = data.lastTimeRoulleteSpinned;
                newLastTimeRoulleteSpinnedRandomly =
                    data.lastTimeRoulleteSpinnedRandomly;

                if (
                    lastTimeRoulleteSpinned &&
                    lastTimeRoulleteSpinned !== newLastTimeRoulleteSpinned &&
                    !didAlreadySpin &&
                    speakerViewList?.length === 1
                ) {
                    spin("force");
                } else if (
                    lastTimeRoulleteSpinnedRandomly &&
                    lastTimeRoulleteSpinnedRandomly !== newLastTimeRoulleteSpinnedRandomly
                ) {
                    setTimeout(() => {
                        spin();
                    }, 300)

                }

                lastTimeRoulleteSpinned = newLastTimeRoulleteSpinned;
                lastTimeRoulleteSpinnedRandomly = newLastTimeRoulleteSpinnedRandomly;
            });
    }, 400);

    spinner.addEventListener("transitionend", () => {
        cancelAnimationFrame(tickerAnim);
        rotation %= 360;

        selectPrize();
        wheel.classList.remove(spinClass);
        spinner.style.setProperty("--rotate", rotation);

        console.log(selectedParticipant);

        fetch("http://localhost:3900/addPin", {
            method: "post",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: selectedParticipant }),
        }).then((response) => response.json());
    });

    setupWheel();
};

start();
