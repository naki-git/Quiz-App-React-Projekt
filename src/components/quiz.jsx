import { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import '/css/style.css';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This app can be split in hooks (e. g. API Fetch, Settings / Menu, ...),                                             //
// also Quiz menu can be split into an other component,                                                                //
// but because it is relatively small as of now, I decided against it, to not make the management too complex for now. //
// Bigger projects (600+ lines of code would benefit from splitting.)                                                  //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Quiz component
const Quiz = () => {
	// Settings / Menu
	const [menu, setMenu] = useState(true);
	const [quizSettings, setQuizSettings] = useState({
		amount: 10,
		category: '',
		difficulty: '',
		type: '',
		timerDuration: 0,
	});

	// Open Trivia DB API Fetch
	const [categories, setCategories] = useState([]);
	const [questions, setQuestions] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [remainingTimeUntilFetch, setRemainingTimeUntilFetch] = useState(0);
	const hasFetched = useRef(false);

	// Game logic
	const [currentQuestion, setCurrentQuestion] = useState(0);
	const [shuffledAnswers, setShuffledAnswers] = useState([]);
	const [timerTimeLeft, setTimerTimeLeft] = useState(
		quizSettings.timerDuration
	);
	const timerRef = useRef(null);
	const [selectedAnswer, setSelectedAnswer] = useState(null);
	const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
	const [score, setScore] = useState(0);
	const [showScore, setShowScore] = useState(false);

	// Fetch categories from the API
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const response = await fetch('https://opentdb.com/api_category.php');
				const data = await response.json();
				setCategories(data.trivia_categories);
			} catch (error) {
				console.error('Failed to fetch categories:', error);
				setError('Failed to fetch categories. Please try again later.');
			}
		};

		fetchCategories();
	}, []);

	// Fetch questions based on set quiz settings
	useEffect(() => {
		if (!menu) {
			// API is rate limited to one request every 5 seconds. Therefore in localStorage we store the last time a fetch has been initialized, to not call the API again accross multiple browser tabs.
			const fetchData = async () => {
				if (hasFetched.current) return;

				const lastFetchTime = localStorage.getItem('lastFetchTime');
				const now = Date.now();

				const timeSinceLastFetch = now - parseInt(lastFetchTime, 10);
				const timeToWait = Math.max(0, 5000 - timeSinceLastFetch);

				if (timeToWait > 0) {
					setRemainingTimeUntilFetch(Math.ceil(timeToWait / 1000)); // Round up to seconds
					setTimeout(() => {
						fetchData();
					}, timeToWait);
					return;
				}

				hasFetched.current = true;
				localStorage.setItem('lastFetchTime', now.toString());

				try {
					const { amount, category, difficulty, type } = quizSettings;
					let url = `https://opentdb.com/api.php?amount=${amount}`;
					if (category) url += `&category=${category}`;
					if (difficulty) url += `&difficulty=${difficulty}`;
					if (type) url += `&type=${type}`;

					const response = await fetch(url);
					const data = await response.json();
					if (data.response_code === 0) {
						setQuestions(data.results);
					} else {
						console.error('No questions found with the selected settings.');
						setError('No questions found with the selected settings.');
					}
				} catch (error) {
					console.error('Failed to fetch questions:', error);
					setError('Failed to fetch questions. Please try again later.');
				} finally {
					setIsLoading(false);
					setRemainingTimeUntilFetch(0);
				}
			};

			fetchData();
		}
	}, [menu, quizSettings]);

	// Handle answers
	const handleAnswer = useCallback(
		(answer) => {
			clearInterval(timerRef.current);
			const correctAnswer = questions[currentQuestion].correct_answer;
			const isCorrect = answer === correctAnswer;

			setSelectedAnswer(answer);
			setIsAnswerCorrect(isCorrect);

			// Update score
			if (isCorrect) {
				setScore(score + 1);
			}

			// Jump to next question or show score screen if finished after 4 seconds
			setTimeout(() => {
				const nextQuestion = currentQuestion + 1;
				if (nextQuestion < questions.length) {
					setCurrentQuestion(nextQuestion);
					setSelectedAnswer(null);
					setIsAnswerCorrect(null);
				} else {
					setShowScore(true);
				}
			}, 4000);
		},
		[currentQuestion, questions, score]
	);

	// Shuffle answers once when the question changes
	useEffect(() => {
		if (questions.length > 0) {
			const answers = [
				...questions[currentQuestion].incorrect_answers,
				questions[currentQuestion].correct_answer,
			];
			setShuffledAnswers(answers.sort(() => Math.random() - 0.5));
		}
	}, [currentQuestion, questions]);

	// Timer / Countdown implementation, when active (above 0 seconds)
	useEffect(() => {
		const startTimer = () => {
			if (quizSettings.timerDuration > 0 && !selectedAnswer) {
				setTimerTimeLeft(quizSettings.timerDuration);
				timerRef.current = setInterval(() => {
					setTimerTimeLeft((prev) => {
						if (prev <= 1) {
							clearInterval(timerRef.current);
							handleAnswer('timeout');
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			}
		};

		if (!menu && !showScore && !isLoading) {
			startTimer();
		}

		return () => clearInterval(timerRef.current);
	}, [
		currentQuestion,
		menu,
		showScore,
		isLoading,
		selectedAnswer,
		quizSettings.timerDuration,
		handleAnswer,
	]);

	// Check for sessionStorage key-value pair for user defined settings. If found, use that instead of default settings.
	useEffect(() => {
		const savedSettings = sessionStorage.getItem('quizSettings');
		if (savedSettings) {
			const parsedSettings = JSON.parse(savedSettings);
			setQuizSettings(parsedSettings);
		}
	}, []);

	// Start quiz questions
	const handleStartQuiz = (settings) => {
		setQuizSettings(settings);
		setMenu(false);
		sessionStorage.setItem('quizSettings', JSON.stringify(settings));
	};

	// Restart quiz, after clicking button
	const handleRestart = () => {
		setMenu(true);
		setQuestions([]);
		setCurrentQuestion(0);
		setScore(0);
		setShowScore(false);
		setIsLoading(true);
		setError(null);
		setSelectedAnswer(null);
		setIsAnswerCorrect(null);
		hasFetched.current = false;
		setTimerTimeLeft(quizSettings.timerDuration);
	};

	// Menu
	if (menu) {
		return <QuizMenu categories={categories} onStartQuiz={handleStartQuiz} />;
	}

	// Error
	if (error) {
		return (
			<div className="error">
				<p>{error}</p>
				<button onClick={handleRestart}>Restart Quiz</button>
			</div>
		);
	}

	// On load, when fetching data was less than 5 seconds prior, show approximate time left till data will load.
	if (isLoading) {
		return (
			<div>
				{remainingTimeUntilFetch > 0
					? `Please wait ${remainingTimeUntilFetch} seconds...`
					: 'Loading...'}
			</div>
		);
	}

	// Render Score / Progress bar / Questions components
	return (
		<div className="quiz">
			{showScore ? (
				<div className="score-section">
					<h2>Quiz over!</h2>
					<p>
						You scored {score} out of {questions.length}!
					</p>
					<button onClick={handleRestart}>Restart Quiz</button>
				</div>
			) : (
				<>
					<div className="question-section">
						<div className="question-count">
							<span>
								Question {currentQuestion + 1} / {questions.length}
							</span>
						</div>
						<div className="progress-bar">
							<div
								style={{
									width: `${((currentQuestion + 1) / questions.length) * 100}%`,
								}}
							/>
						</div>

						{quizSettings.timerDuration > 0 && (
							<div className="timer">
								Time remaining:{' '}
								<span
									style={{
										color:
											timerTimeLeft <= quizSettings.timerDuration * 0.5
												? timerTimeLeft <= quizSettings.timerDuration * 0.25
													? 'var(--col-red)'
													: 'var(--col-orange)'
												: 'inherit',
										fontWeight:
											timerTimeLeft <= quizSettings.timerDuration * 0.5
												? 'bold'
												: 'normal',
										transition: 'all var(--anim-dur)',
									}}
								>
									{timerTimeLeft} seconds
								</span>
							</div>
						)}
						<div
							className="question-text"
							dangerouslySetInnerHTML={{
								__html: DOMPurify.sanitize(questions[currentQuestion].question),
							}}
						/>
					</div>
					<div className="answer-section">
						{shuffledAnswers.map((answer, index) => (
							<button
								key={index}
								onClick={() => handleAnswer(answer)}
								className={
									selectedAnswer === answer
										? isAnswerCorrect
											? 'correct'
											: 'incorrect'
										: selectedAnswer !== null &&
										  answer === questions[currentQuestion].correct_answer
										? 'correct-answer'
										: ''
								}
								disabled={
									selectedAnswer !== null ||
									(quizSettings.timerDuration > 0 && timerTimeLeft <= 0)
								}
								dangerouslySetInnerHTML={{
									__html: DOMPurify.sanitize(answer),
								}}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};

// Quiz Menu component
const QuizMenu = ({ categories, onStartQuiz }) => {
	// Use either default values or sessionStorage key-value pair for user defined settings
	const [amount, setAmount] = useState(() => {
		const saved = sessionStorage.getItem('quizSettings');
		return saved ? Number(JSON.parse(saved).amount) : 10;
	});
	const [category, setCategory] = useState(() => {
		const saved = sessionStorage.getItem('quizSettings');
		return saved ? JSON.parse(saved).category : '';
	});
	const [difficulty, setDifficulty] = useState(() => {
		const saved = sessionStorage.getItem('quizSettings');
		return saved ? JSON.parse(saved).difficulty : '';
	});
	const [type, setType] = useState(() => {
		const saved = sessionStorage.getItem('quizSettings');
		return saved ? JSON.parse(saved).type : '';
	});
	const [timerDuration, setTimerDuration] = useState(() => {
		const saved = sessionStorage.getItem('quizSettings');
		return saved ? Number(JSON.parse(saved).timerDuration) : 0;
	});

	// After clicking "Start Quiz" button
	const handleStart = () => {
		const settings = {
			amount,
			category,
			difficulty,
			type,
			timerDuration,
		};
		// Set sessionStorage pair to save quiz settings
		sessionStorage.setItem('quizSettings', JSON.stringify(settings));
		onStartQuiz(settings);
	};

	// Render main menu
	return (
		<div className="quiz-menu">
			<h1>Quiz Settings</h1>
			<div>
				<label>
					Number of Questions:
					<select
						name="Number of Questions"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					>
						<option value={5}>5</option>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
					</select>
				</label>
			</div>
			<div>
				<label>
					Category:
					<select
						name="Category"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						<option value="">Any Category</option>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.id}>
								{cat.name}
							</option>
						))}
					</select>
				</label>
			</div>
			<div>
				<label>
					Difficulty:
					<select
						name="Difficulty"
						value={difficulty}
						onChange={(e) => setDifficulty(e.target.value)}
					>
						<option value="">Any Difficulty</option>
						<option value="easy">Easy</option>
						<option value="medium">Medium</option>
						<option value="hard">Hard</option>
					</select>
				</label>
			</div>
			<div>
				<label>
					Type of Question:
					<select
						name="Type of Question"
						value={type}
						onChange={(e) => setType(e.target.value)}
					>
						<option value="">Any Type</option>
						<option value="multiple">Multiple Choice</option>
						<option value="boolean">True/False</option>
					</select>
				</label>
			</div>
			<div>
				<label>
					Time per question:
					<input
						name="Time per question"
						type="range"
						min="0"
						max="60"
						step="5"
						value={timerDuration}
						onChange={(e) => setTimerDuration(Number(e.target.value))}
					/>
					{timerDuration === 0
						? 'No timer (Disabled)'
						: `${timerDuration} seconds`}
				</label>
			</div>
			<button onClick={handleStart}>Start Quiz</button>
		</div>
	);
};

export default Quiz;
