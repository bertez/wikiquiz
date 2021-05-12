import { shuffleArray, randomItem, getData } from "/js/helpers.js";

const STATE = {
  points: 0,
  articles: [],
};

const quiz = document.querySelector("#quiz");
const points = document.querySelector("#points");

const HIDETEXT = "██████████";

async function getArticleRelatedCategories(article) {
  const data = await getData(
    `https://es.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=categories&titles=${article}`
  );

  const key = Object.keys(data.query.pages)[0];

  const categories = data.query.pages[key].categories
    .map((category) => category.title)
    .filter((category) => !category.includes("Wikipedia"));

  return categories;
}

async function getArticlesFromCategory(category, excludedTitle) {
  const data = await getData(
    `https://es.wikipedia.org/w/api.php?format=json&origin=*&action=query&list=categorymembers&cmlimit=500&cmtitle=${category}`
  );
  return data.query.categorymembers
    .map((category) => category.title)
    .filter(
      (category) =>
        !category.includes("Categoría") &&
        !category.includes("Anexo") &&
        !category.includes("Portal") &&
        !category.includes("Usuario") &&
        category !== excludedTitle
    );
}

async function generateQuestion() {
  try {
    quiz.innerHTML = "Cargando...";

    const answer = randomItem(STATE.articles);

    const { displaytitle, extract } = await getData(
      `https://es.wikipedia.org/api/rest_v1/page/summary/${answer}`
    );

    const regex = new RegExp(`${displaytitle}`, "ig");
    const clue = extract.replaceAll(regex, HIDETEXT);

    if (!clue.includes(HIDETEXT)) {
      throw new Error("Cannot find title in extract");
    }
    const relatedCategories = await getArticleRelatedCategories(answer);
    const chosenRelatedCategory = randomItem(relatedCategories).replaceAll(
      " ",
      "_"
    );

    const randomOptions = await getArticlesFromCategory(
      chosenRelatedCategory,
      displaytitle
    );

    const extraOptions = shuffleArray(randomOptions).slice(0, 3);

    if (extraOptions.length < 3) {
      throw new Error("Not enough options");
    }

    const question = {
      clue,
      answer: displaytitle,
      options: shuffleArray([...extraOptions, displaytitle]),
    };

    writeQuestion(question);
  } catch (error) {
    generateQuestion();
  }
}

function writeQuestion(question) {
  quiz.innerHTML = "";
  points.innerText = STATE.points;

  const clue = document.createElement("p");
  clue.innerText = question.clue;

  quiz.append(clue);

  for (const answer of question.options) {
    const answerButton = document.createElement("button");
    answerButton.innerText = answer;
    answerButton.onclick = () => {
      if (answer === question.answer) {
        alert("correcto!");
        STATE.points++;
      } else {
        alert("sorry vuelves a empezar!");
        STATE.points = 0;
      }
      generateQuestion();
    };
    quiz.append(answerButton);
  }
}

async function start() {
  try {
    const yesterday = new Date(Date.now() - 86400000);

    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, "0");
    const day = String(yesterday.getDate()).padStart(2, "0");

    const { items } = await getData(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/es.wikipedia.org/all-access/${year}/${month}/${day}`
    );

    const validArticles = items[0].articles.filter(
      (item) => !item.article.includes(":")
    );

    STATE.articles = validArticles.map((item) => item.article);

    generateQuestion();
  } catch (error) {
    console.error(error);
  }
}

start();
