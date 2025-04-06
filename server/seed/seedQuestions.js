const mongoose = require('mongoose');
require('dotenv').config();
const Question = require('../models/Question');

// Set strictQuery to suppress the warning
mongoose.set('strictQuery', false);

// Sample questions data
const questionsData = [
  // Australian Democracy
  {
    category: 'Australian Democracy',
    question: 'What is the capital city of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    correctAnswer: 2,
    explanation: 'Canberra is the capital city of Australia. It was chosen as a compromise between rivals Sydney and Melbourne.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Democracy',
    question: 'What colors are on the Australian flag?',
    options: ['Red, white and blue', 'Green and gold', 'Blue, white and red', 'Black, red and yellow'],
    correctAnswer: 0,
    explanation: 'The Australian flag contains red, white and blue colors, featuring the Union Jack and Southern Cross.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Democracy',
    question: 'What do we call a vote of all Australian citizens who are on the electoral roll?',
    options: ['General election', 'Referendum', 'Plebiscite', 'Ballot'],
    correctAnswer: 1,
    explanation: 'A referendum is a vote of all Australian citizens who are on the electoral roll to approve a change to the Australian Constitution.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Democracy',
    question: 'What is the name of the Australian Parliament?',
    options: ['Commonwealth Parliament', 'Federal Parliament', 'National Parliament', 'Australian Parliament'],
    correctAnswer: 0,
    explanation: 'The Commonwealth Parliament is the name of the Australian Parliament.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Democracy',
    question: 'Who is Australia\'s Head of State?',
    options: ['The Prime Minister', 'The Governor-General', 'The King', 'The Chief Justice'],
    correctAnswer: 2,
    explanation: 'The King (currently King Charles III) is Australia\'s Head of State, represented in Australia by the Governor-General.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Democracy',
    question: 'What are the three levels of government in Australia?',
    options: ['Federal, state and local', 'Executive, legislative and judicial', 'Commonwealth, territory and municipal', 'National, regional and district'],
    correctAnswer: 0,
    explanation: 'Australia has three levels of government: federal, state/territory, and local government.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Democracy',
    question: 'How many senators does each state elect to the Australian Parliament?',
    options: ['6', '12', '24', '76'],
    correctAnswer: 1,
    explanation: 'Each state elects 12 senators to the Australian Parliament, while territories elect 2 each.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Democracy',
    question: 'What is the maximum period between federal elections for the House of Representatives?',
    options: ['2 years', '3 years', '4 years', '5 years'],
    correctAnswer: 1,
    explanation: 'Federal elections for the House of Representatives must be held at least once every 3 years.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Democracy',
    question: 'What is the first line of Australia\'s national anthem?',
    options: ['God save our gracious King', 'Australians all let us rejoice', 'For we are young and free', 'Our land abounds in nature\'s gifts'],
    correctAnswer: 1,
    explanation: 'The first line of Australia\'s national anthem is "Australians all let us rejoice".',
    difficulty: 'easy'
  },
  {
    category: 'Australian Democracy',
    question: 'What is a bill?',
    options: ['A formal proposal to make a new law', 'A list of government expenditures', 'A type of referendum', 'A parliamentary debate'],
    correctAnswer: 0,
    explanation: 'A bill is a proposal for a new law or a change to an existing law that is presented to Parliament for consideration.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Democracy',
    question: 'What is the role of the Governor-General?',
    options: ['To lead the opposition party', 'To represent the King in Australia', 'To write Australian laws', 'To lead the Australian Defence Force'],
    correctAnswer: 1,
    explanation: 'The Governor-General represents the King in Australia and performs ceremonial duties.',
    difficulty: 'medium'
  },
  
  // Laws and Government
  {
    category: 'Laws and Government',
    question: 'What is the highest court in Australia?',
    options: ['Federal Court', 'Supreme Court', 'High Court', 'Commonwealth Court'],
    correctAnswer: 2,
    explanation: 'The High Court is the highest court in Australia\'s judicial system.',
    difficulty: 'medium'
  },
  {
    category: 'Laws and Government',
    question: 'Which of these is a responsibility of Australian citizens aged 18 years or over?',
    options: ['To attend local council meetings', 'To vote in elections', 'To have a current passport', 'To join a political party'],
    correctAnswer: 1,
    explanation: 'Voting in federal and state or territory elections, and in a referendum, is compulsory for Australian citizens aged 18 years or over.',
    difficulty: 'easy'
  },
  {
    category: 'Laws and Government',
    question: 'What is the document that sets out the rules for the government of Australia?',
    options: ['The Australian Constitution', 'The Commonwealth Agreement', 'The Federal Charter', 'The National Declaration'],
    correctAnswer: 0,
    explanation: 'The Australian Constitution sets out the basic rules for the government of Australia.',
    difficulty: 'easy'
  },
  {
    category: 'Laws and Government',
    question: 'What is the role of the Australian Electoral Commission?',
    options: ['To propose new laws', 'To organize elections', 'To appoint senators', 'To count the population'],
    correctAnswer: 1,
    explanation: 'The Australian Electoral Commission (AEC) is responsible for organizing and conducting federal elections and referendums.',
    difficulty: 'medium'
  },
  {
    category: 'Laws and Government',
    question: 'What are the two houses of the Australian Parliament?',
    options: ['The House of Commons and the Senate', 'The House of Representatives and the Senate', 'The Upper House and the Lower House', 'The State Assembly and the National Council'],
    correctAnswer: 1,
    explanation: 'The Australian Parliament consists of two houses: the House of Representatives and the Senate.',
    difficulty: 'easy'
  },
  {
    category: 'Laws and Government',
    question: 'Who maintains peace and order in Australia?',
    options: ['Lawyers', 'Police', 'Priests', 'Military'],
    correctAnswer: 1,
    explanation: 'The police maintain peace and order in Australia. They are independent of government.',
    difficulty: 'easy'
  },
  {
    category: 'Laws and Government',
    question: 'What is the minimum voting age in Australia?',
    options: ['16 years', '18 years', '21 years', '25 years'],
    correctAnswer: 1,
    explanation: 'The minimum voting age in Australia is 18 years.',
    difficulty: 'easy'
  },
  {
    category: 'Laws and Government',
    question: 'What happens if you are found guilty of a serious crime in Australia?',
    options: ['You will be deported', 'You will lose your citizenship', 'You may go to prison', 'You will be fined only'],
    correctAnswer: 2,
    explanation: 'If you are found guilty of a serious crime in Australia, you may go to prison.',
    difficulty: 'medium'
  },
  {
    category: 'Laws and Government',
    question: 'Who is responsible for making laws in Australia?',
    options: ['The Prime Minister', 'The Governor-General', 'The Parliament', 'The High Court'],
    correctAnswer: 2,
    explanation: 'The Parliament is responsible for making and changing laws in Australia.',
    difficulty: 'easy'
  },
  {
    category: 'Laws and Government',
    question: 'What is the term of office for a senator in the Australian Parliament?',
    options: ['3 years', '4 years', '6 years', '8 years'],
    correctAnswer: 2,
    explanation: 'Senators are usually elected for a term of six years.',
    difficulty: 'medium'
  },
  {
    category: 'Laws and Government',
    question: 'Who is the head of the Australian Government?',
    options: ['The Governor-General', 'The Prime Minister', 'The King', 'The Chief Justice'],
    correctAnswer: 1,
    explanation: 'The Prime Minister is the head of the Australian Government.',
    difficulty: 'easy'
  },
  
  // Australian History
  {
    category: 'Australian History',
    question: 'When did the First Fleet arrive in Australia?',
    options: ['1788', '1778', '1798', '1776'],
    correctAnswer: 0,
    explanation: 'The First Fleet arrived in Australia in 1788, marking the beginning of European settlement.',
    difficulty: 'easy'
  },
  {
    category: 'Australian History',
    question: 'Who were the first inhabitants of Australia?',
    options: ['British settlers', 'Dutch explorers', 'Aboriginal and Torres Strait Islander peoples', 'French colonists'],
    correctAnswer: 2,
    explanation: 'Aboriginal and Torres Strait Islander peoples were the first inhabitants of Australia.',
    difficulty: 'easy'
  },
  {
    category: 'Australian History',
    question: 'When did the gold rush begin in Australia?',
    options: ['1788', '1851', '1901', '1915'],
    correctAnswer: 1,
    explanation: 'The gold rush began in Australia in 1851 when Edward Hargraves discovered gold near Bathurst, NSW.',
    difficulty: 'medium'
  },
  {
    category: 'Australian History',
    question: 'When did Australia become a federation?',
    options: ['1788', '1851', '1901', '1915'],
    correctAnswer: 2,
    explanation: 'Australia became a federation on January 1, 1901, when the six colonies united to form the Commonwealth of Australia.',
    difficulty: 'easy'
  },
  {
    category: 'Australian History',
    question: 'What is the significance of Gallipoli in Australian history?',
    options: ['It was where gold was first discovered', 'It was where the First Fleet landed', 'It was a significant battle in World War I', 'It was where the Australian Constitution was signed'],
    correctAnswer: 2,
    explanation: 'Gallipoli was the site of a significant battle in World War I where Australian and New Zealand forces (ANZAC) fought, establishing a strong national identity.',
    difficulty: 'medium'
  },
  {
    category: 'Australian History',
    question: 'What was the name of the policy that restricted non-European immigration to Australia until the 1970s?',
    options: ['Assimilation Policy', 'White Australia Policy', 'Immigration Restriction Act', 'Pacific Solution'],
    correctAnswer: 1,
    explanation: 'The White Australia Policy restricted non-European immigration to Australia until it was progressively dismantled in the 1960s and 70s.',
    difficulty: 'medium'
  },
  {
    category: 'Australian History',
    question: 'When did Aboriginal Australians get the right to vote in federal elections?',
    options: ['1901', '1925', '1962', '1984'],
    correctAnswer: 2,
    explanation: 'Aboriginal Australians were given the right to vote in federal elections in 1962.',
    difficulty: 'medium'
  },
  {
    category: 'Australian History',
    question: 'What was the name of the ship that brought the First Fleet to Australia?',
    options: ['HMS Endeavour', 'HMS Sirius', 'HMS Bounty', 'HMS Victory'],
    correctAnswer: 1,
    explanation: 'HMS Sirius was the flagship of the First Fleet that brought convicts to Australia in 1788.',
    difficulty: 'hard'
  },
  {
    category: 'Australian History',
    question: 'Who was the first Prime Minister of Australia?',
    options: ['Alfred Deakin', 'Andrew Fisher', 'Edmund Barton', 'John Curtin'],
    correctAnswer: 2,
    explanation: 'Edmund Barton was the first Prime Minister of Australia, serving from 1901 to 1903.',
    difficulty: 'medium'
  },
  {
    category: 'Australian History',
    question: 'What significant referendum took place in Australia in 1967?',
    options: ['To become a republic', 'To include Aboriginal people in the census', 'To join World War II', 'To adopt the current flag'],
    correctAnswer: 1,
    explanation: 'The 1967 referendum approved changes to the Constitution to include Aboriginal people in the census and allow the Commonwealth to make laws for them.',
    difficulty: 'medium'
  },
  {
    category: 'Australian History',
    question: 'What was the Eureka Stockade?',
    options: ['A gold mine', 'A rebellion by gold miners', 'A prison for convicts', 'The first parliament building'],
    correctAnswer: 1,
    explanation: 'The Eureka Stockade was a rebellion by gold miners in Ballarat, Victoria in 1854, protesting against government mining licenses.',
    difficulty: 'medium'
  },
  
  // Australian Society
  {
    category: 'Australian Society',
    question: 'What is the national flower of Australia?',
    options: ['Waratah', 'Golden Wattle', 'Kangaroo Paw', 'Desert Rose'],
    correctAnswer: 1,
    explanation: 'The Golden Wattle is Australia\'s national flower.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'Which of these is an Australian native animal?',
    options: ['Lion', 'Zebra', 'Kangaroo', 'Elephant'],
    correctAnswer: 2,
    explanation: 'The kangaroo is an Australian native animal and appears on the Australian coat of arms.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'What are the national colors of Australia?',
    options: ['Red, white and blue', 'Green and gold', 'Blue and white', 'Red and black'],
    correctAnswer: 1,
    explanation: 'Green and gold are Australia\'s national colors.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'What is a didgeridoo?',
    options: ['A native animal', 'A musical instrument', 'A type of boomerang', 'A traditional food'],
    correctAnswer: 1,
    explanation: 'A didgeridoo is a traditional Aboriginal musical instrument.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'What is the Great Barrier Reef?',
    options: ['A mountain range', 'A desert', 'A coral reef', 'A river'],
    correctAnswer: 2,
    explanation: 'The Great Barrier Reef is the world\'s largest coral reef system, located off the coast of Queensland.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'What is a lamington?',
    options: ['A native animal', 'A type of hat', 'A cake', 'A mountain'],
    correctAnswer: 2,
    explanation: 'A lamington is a traditional Australian cake made of sponge cake coated in chocolate and rolled in coconut.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'What is the largest city in Australia?',
    options: ['Melbourne', 'Brisbane', 'Sydney', 'Perth'],
    correctAnswer: 2,
    explanation: 'Sydney is the largest city in Australia by population.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'What is Uluru?',
    options: ['A river', 'A mountain', 'A large rock formation', 'A desert'],
    correctAnswer: 2,
    explanation: 'Uluru (formerly known as Ayers Rock) is a large sandstone rock formation in the Northern Territory, sacred to Indigenous Australians.',
    difficulty: 'easy'
  },
  {
    category: 'Australian Society',
    question: 'What is the most widely practiced religion in Australia?',
    options: ['Buddhism', 'Islam', 'Hinduism', 'Christianity'],
    correctAnswer: 3,
    explanation: 'Christianity is the most widely practiced religion in Australia, although Australia is a secular country with no official religion.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Society',
    question: 'What is "bush tucker"?',
    options: ['A style of dancing', 'Native Australian food', 'A type of clothing', 'A traditional ceremony'],
    correctAnswer: 1,
    explanation: '"Bush tucker" refers to native Australian food that was traditionally collected and eaten by Aboriginal Australians.',
    difficulty: 'medium'
  },
  {
    category: 'Australian Society',
    question: 'What is the name of Australia\'s most famous horse race?',
    options: ['The Sydney Cup', 'The Melbourne Cup', 'The Brisbane Derby', 'The Perth Stakes'],
    correctAnswer: 1,
    explanation: 'The Melbourne Cup is Australia\'s most famous horse race, held on the first Tuesday in November.',
    difficulty: 'easy'
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected...');
    
    try {
      // Clear existing questions
      await Question.deleteMany({});
      console.log('Existing questions cleared');
      
      // Insert new questions
      await Question.insertMany(questionsData);
      console.log(`${questionsData.length} questions inserted successfully`);
      
      mongoose.disconnect();
      console.log('Database seeded successfully');
    } catch (err) {
      console.error('Error seeding database:', err);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });