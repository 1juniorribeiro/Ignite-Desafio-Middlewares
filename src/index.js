const express = require('express'); // importamos o express
const cors = require('cors'); // importamos o cors para rodar a plicação nos testes eu acho

const { v4: uuidv4, validate } = require('uuid'); // importamos o vd do uuid e mudamos o nome para usar e importamos a função de validação se o id é um uuid

const app = express(); // colocamos o as funçções do express a disposição da cosntante app
app.use(express.json()); // colocamos a aplicação para usar json como padrao
app.use(cors()); // e para usar o cors para conexão

const users = []; // declaramos o array de usuarios para armazenar os dados

function checksExistsUserAccount(request, response, next) { // middleware para verificar se o usuario existe
  const { username } = request.headers;  // recebemos o username pelo header da requisição

  const user = users.find(user => username === user.username); // procuramos no array de usuarios um usuario com o username igual ou recebido pela requisição

  if (!user) { // se não encontrar o usuario
    return response.status(404).json({ error: "user not found"}) // retornar o erro
  }

  request.user = user; // atribuir dentro do request user o user encontrado pelo id

  return next(); // prosseguir deu certo
}

function checksCreateTodosUserAvailability(request, response, next) { // aqui criamos o middleware para checar se o usuario é pro para cadastrar tarefas
  const { user } = request; // recebemos o usuario desestruturado da request que foi atribuido pelo middleware anterior

  if(!(user.pro === true || user.todos.length <= 9 )) { // verificamos se o usuario é pro e se não for tem que ter menos de 10 tarefas, então ou é pro ou tem menos de 10 tarefas, usamos o length para verificar o tamanho do array para saber
    return response.status(403).json({ error: "User exceede the maximum of todos"})// se não for nenhuma das duas erros
  }

  return next(); // validado podemos seguir com a aplicação
}

function checksTodoExists(request, response, next) { // aqui checamos se as tarefas existem
  const { username } = request.headers; // recebemos o usuario pelo header
  const { id } = request.params; // recebemos o id pelos parametros da requisição ou seja, pelo link /id

  const user = users.find(user => username === user.username); // recebemos o usuario encontrado com o mesmo nome de usuario

  if (!user) { // se não for encontrado retornamos um erro
    return response.status(404).json({ error: "user not found"})
  }

  if(!validate(id)) { // em seguida validamos se o id é uma uuid com a função validate que retorna um boolean se for uuid prosseguimos se não erro
    return response.status(400).json({ error: "id not found"});
  } 

  const todo = user.todos.find((todo) => todo.id === id); // aqui buscamos dentro do array de todos do usuario um todo com o id informado nos parametros da requisição

  if(!todo) { // se não encontrarmos retornamos um erro
    return response.status(404).json({ error: "todo not found"});
  }

  request.user = user; // se encontrarmos armazenamos na request o usuario e a tarefa abaixo
  request.todo = todo; 

  return next(); // e então prosseguimos com a aplicação
}

function findUserById(request, response, next) { // criamos o middleware para procurar o usuario pelo id
  const { id } = request.params; // recebemos o id do usuario pelos parametros

  const user = users.find(user => id === user.id); // procuramos o usuario pelo id no array de usuarios e armazenamos na constante user

  if(!user) { // se não encontrar retornamos um erro
    return response.status(404).json({ error: "user not found"});
  }

  request.user = user; // se ecnontrar armazenamos ele na request com o nome de user

  return next(); // prosseguimos com a aplicação
}

app.post('/users', (request, response) => { // criamos a rota de criação de usuarios
  const { name, username } = request.body; // recebemos o nome e o username pelo corpo da requisição

  const usernameAlreadyExists = users.some((user) => user.username === username); // aqui procuramos algum usuario com o username no array de usuarios

  if (usernameAlreadyExists) { // se o nome de usuario existir seguimos com um erro
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = { //se não existir colocamos as informações em um objeto para ser adicionado a um array
    id: uuidv4(), // geramos um id com o uuid
    name, // armazenamos o nome do usuario
    username, // armazenamos o username do usuario
    pro: false, // colocamos por padrao como false o usuario ser pro
    todos: [] // criamos o array de tarefas do usuario
  };

  users.push(user); // fazemos um push e adicionamos o objeto no array

  return response.status(201).json(user); // retornamos o usuario com um status de sucesso
});

app.get('/users/:id', findUserById, (request, response) => { // criamos a rota para mostrar um usuario pelo id, usando o middleware de busca pelo id
  const { user } = request; // recebemos o user pelo request do middleware de encontrar pelo id

  return response.json(user); // retornamos o usuario 
});

app.patch('/users/:id/pro', findUserById, (request, response) => { // criamos a rota para alterar o plano do usuario para pro
  const { user } = request; // recebemos o user pelo request do middleware de encontrar pelo id

  if (user.pro) { // se o usuario ja for pro, no caso true aqui retornamos um erro avisando q ele ja é pro
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true; // se não colocamos ele como pro

  return response.json(user); // e retornamos o usuario
});

app.get('/todos', checksExistsUserAccount, (request, response) => { // criamos a rota para listar as tarefas do usuario pelo username, com o middleware de procurar pelo username
  const { user } = request; // recebemos o user pelo request do middleware

  return response.json(user.todos); // mostramos as tarefas pelo user que vem do middleware
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => { // criamos a rota pra criar tarefas, usamos o middleware para verificar se o ususario existe e se ele é pro ou não
  const { title, deadline } = request.body; // recebemos o titulo e a data de entrega para a tarefa pelo corpo da requisição
  const { user } = request; // recebemos o usuario pelo request do middleware

  const newTodo = { // criamos o objeto da nova tarefa
    id: uuidv4(), // geramos um id com uuid
    title, // armazenamos o nome
    deadline: new Date(deadline), // armazenamos a data de entrega como uma nova data para que o js possa ler a data
    done: false, // colocamos como pronta por padrao false
    created_at: new Date() // e a data da criação da tarefa como new date para o js entender
  };

  user.todos.push(newTodo); // armazenamos a tarefa no array de tarefas do usuario com o push

  return response.status(201).json(newTodo); // retornamos o sucesso da criação
});

app.put('/todos/:id', checksTodoExists, (request, response) => { // criamos a rota de atualização de uma tarefa, e usamos o middleware para checar s eo todo existe
  const { title, deadline } = request.body; // recebemos o titulo e a data de entrega pelo corpo da requisição 
  const { todo } = request; // recebemos o todo do middleware 

  todo.title = title; // atribuimos o novo titulo e a nova data
  todo.deadline = new Date(deadline);

  return response.json(todo); // mostramos a tarefa atualizada
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => { // criamos a rota para marcar a tarefa como feita e usamos o middleware para verificar se a tarefa existe
  const { todo } = request; // recebemos a tarefa pelo middleware

  todo.done = true; // atribuimos true para o atributo done

  return response.json(todo); // retornamos a tarefa como feita
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => { // criamos a rota para deletar um todo, usamos os middleware para verificar se o usuario existe e se o todo existe
  const { user, todo } = request; // recebemos o todo e o usuario dos middleware

  const todoIndex = user.todos.indexOf(todo); // encontramos o index do todo no array de tarefas do usuario 

  if (todoIndex === -1) { // se não existir no array retornamos um erro, no caso o -1 sinaliza um array vazio
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1); // usamos o splice para retirar do array a tarefa do index encontrado ali em cima

  return response.status(204).send(); // retornamos uma resposta de sucesso
});

module.exports = { // aqui acho que são exportados para os testes
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};