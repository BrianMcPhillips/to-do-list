require('dotenv').config();

const { execSync } = require('child_process');

const fakeRequest = require('supertest');
const app = require('../lib/app');
const client = require('../lib/client');

describe('routes', () => {
  let token;

  const newToDo = {
    id: 7,
    name: 'clean ceiling',
    completed: true,
    importance: 2,
    owner_id: 2,
  };

  beforeAll(async done => {
    execSync('npm run setup-db');

    client.connect();

    const signInData = await fakeRequest(app)
      .post('/auth/signup')
      .send({
        email: 'jon@user.com',
        password: '1234'
      });
    
    token = signInData.body.token;

    return done();
  });

  afterAll(done => {
    return client.end(done);
  });

  test('returns a new list item when creating new list item', async(done) => {

    const data = await fakeRequest(app)
      .post('/api/toDoList')
      .send(newToDo)
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual(newToDo);

    done();
  });

  test('returns all list items for the user when hitting GET /api/toDoList', async(done) => {
    const expected = [{
      id: 7,
      name: 'clean ceiling',
      completed: true,
      importance: 2,
      owner_id: 2,
    }
    
    ];

    const data = await fakeRequest(app)
      .get('/api/toDoList')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual(expected);

    done();
  });

  test('returns a single list item for the user when hitting GET /toDoList/:id', async(done) => {
    const expected = {
      id: 7,
      name: 'clean ceiling',
      completed: true,
      importance: 2,
      owner_id: 2
    };

    const data = await fakeRequest(app)
      .get('/api/toDoList/7')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual(expected);

    done();
  });

  test('updates a single to do list item for the user when hitting PUT /toDoList/:id', async(done) => {
    const newListItem = {
      id: 7,
      name: 'clean ceiling',
      completed: false,
      importance: 2,
      owner_id: 2,
    }
    ;

    const expectedAllListItems = [{
      id: 7,
      name: 'clean ceiling',
      completed: false,
      importance: 2,
      owner_id: 2,
    }];

    const data = await fakeRequest(app)
      .put('/api/toDoList/7')
      .send(newListItem)
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    const allListItems = await fakeRequest(app)
      .get('/api/toDoList')
      .send(newListItem)
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual(newListItem);
    expect(allListItems.body).toEqual(expectedAllListItems);

    done();
  });

  test('delete a single list item for the user when hitting DELETE /toDoList/:id', async(done) => {
    await fakeRequest(app)
      .delete('/api/toDoList/7')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    const data = await fakeRequest(app)
      .get('/api/toDoList/')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual([]);

    done();
  });
});
