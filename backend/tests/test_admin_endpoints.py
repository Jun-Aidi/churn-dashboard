"""
Unit tests for admin user management endpoints (Task 2.2).
Tests validate: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 5.9
"""

import pytest
from flask import Flask
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from unittest.mock import patch
from datetime import datetime
import bcrypt

from app.database import Base
from app.models.user import User
from app.routes.auth_routes import auth_bp
from app.utils.jwt_utils import create_token


@pytest.fixture
def app():
    """Create a test Flask app with in-memory SQLite database."""
    app = Flask(__name__)
    app.config['TESTING'] = True

    # Use in-memory SQLite for tests
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    TestSession = scoped_session(sessionmaker(bind=engine))

    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # Patch get_session and close_session to use test database
    with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
        pass  # Will be patched in each test

    yield app, engine, TestSession

    TestSession.remove()
    Base.metadata.drop_all(engine)


@pytest.fixture
def admin_user(app):
    """Create an admin user in the test database."""
    _, engine, TestSession = app
    session = TestSession()
    password_hash = bcrypt.hashpw('adminpass123'.encode('utf-8'), bcrypt.gensalt(rounds=4)).decode('utf-8')
    admin = User(
        name='Admin Test',
        email='admin@test.com',
        password_hash=password_hash,
        role='admin',
        is_active=True,
        created_at=datetime.utcnow(),
    )
    session.add(admin)
    session.commit()
    admin_id = admin.id
    session.close()
    return admin_id


@pytest.fixture
def regular_user(app):
    """Create a regular user in the test database."""
    _, engine, TestSession = app
    session = TestSession()
    password_hash = bcrypt.hashpw('userpass123'.encode('utf-8'), bcrypt.gensalt(rounds=4)).decode('utf-8')
    user = User(
        name='Regular User',
        email='user@test.com',
        password_hash=password_hash,
        role='user',
        is_active=True,
        created_at=datetime.utcnow(),
    )
    session.add(user)
    session.commit()
    user_id = user.id
    session.close()
    return user_id


def _get_admin_token(app_tuple, admin_user):
    """Generate a valid admin JWT token for testing."""
    _, _, TestSession = app_tuple
    session = TestSession()
    admin = session.query(User).filter_by(id=admin_user).first()
    token = create_token(admin)
    session.close()
    return token


def _make_auth_header(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


class TestListUsers:
    """Tests for GET /api/auth/users"""

    def test_list_users_returns_all_users_sorted_by_created_at_desc(self, app, admin_user, regular_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.get('/api/auth/users', headers=_make_auth_header(token))

        assert response.status_code == 200
        data = response.get_json()
        assert 'users' in data
        assert len(data['users']) == 2
        # Check sorted by created_at desc
        assert data['users'][0]['created_at'] >= data['users'][1]['created_at']

    def test_list_users_requires_admin(self, app, admin_user, regular_user):
        app_instance, _, TestSession = app

        # Get a regular user token
        session = TestSession()
        user = session.query(User).filter_by(id=regular_user).first()
        token = create_token(user)
        session.close()

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.get('/api/auth/users', headers=_make_auth_header(token))

        assert response.status_code == 403


class TestCreateUser:
    """Tests for POST /api/auth/users"""

    def test_create_user_success(self, app, admin_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        new_user_data = {
            "name": "New User",
            "email": "new@example.com",
            "password": "securepass",
            "role": "user"
        }

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.post('/api/auth/users',
                                           headers=_make_auth_header(token),
                                           json=new_user_data)

        assert response.status_code == 201
        data = response.get_json()
        assert data['user']['name'] == 'New User'
        assert data['user']['email'] == 'new@example.com'
        assert data['user']['role'] == 'user'
        assert data['user']['is_active'] == True

    def test_create_user_duplicate_email_returns_409(self, app, admin_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        new_user_data = {
            "name": "Duplicate",
            "email": "admin@test.com",  # Already exists
            "password": "securepass",
            "role": "user"
        }

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.post('/api/auth/users',
                                           headers=_make_auth_header(token),
                                           json=new_user_data)

        assert response.status_code == 409
        data = response.get_json()
        assert data['error'] == 'Email sudah digunakan'

    def test_create_user_validation_error_short_password(self, app, admin_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        new_user_data = {
            "name": "Test",
            "email": "test@example.com",
            "password": "short",
            "role": "user"
        }

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.post('/api/auth/users',
                                           headers=_make_auth_header(token),
                                           json=new_user_data)

        assert response.status_code == 422
        data = response.get_json()
        assert 'Validasi gagal' in data['error']

    def test_create_user_validation_error_invalid_role(self, app, admin_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        new_user_data = {
            "name": "Test",
            "email": "test@example.com",
            "password": "securepass",
            "role": "superadmin"
        }

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.post('/api/auth/users',
                                           headers=_make_auth_header(token),
                                           json=new_user_data)

        assert response.status_code == 422


class TestDeactivateUser:
    """Tests for POST /api/auth/users/<id>/deactivate"""

    def test_deactivate_user_success(self, app, admin_user, regular_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.post(f'/api/auth/users/{regular_user}/deactivate',
                                           headers=_make_auth_header(token))

        assert response.status_code == 200
        data = response.get_json()
        assert data['user']['is_active'] == False

    def test_self_deactivation_returns_400(self, app, admin_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.post(f'/api/auth/users/{admin_user}/deactivate',
                                           headers=_make_auth_header(token))

        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Admin tidak dapat menonaktifkan akun sendiri'


class TestActivateUser:
    """Tests for POST /api/auth/users/<id>/activate"""

    def test_activate_user_success(self, app, admin_user, regular_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        # First deactivate
        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    client.post(f'/api/auth/users/{regular_user}/deactivate',
                                headers=_make_auth_header(token))

        # Then activate
        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.post(f'/api/auth/users/{regular_user}/activate',
                                           headers=_make_auth_header(token))

        assert response.status_code == 200
        data = response.get_json()
        assert data['user']['is_active'] == True


class TestUpdateUser:
    """Tests for PUT /api/auth/users/<id>"""

    def test_update_user_name(self, app, admin_user, regular_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.put(f'/api/auth/users/{regular_user}',
                                          headers=_make_auth_header(token),
                                          json={"name": "Updated Name"})

        assert response.status_code == 200
        data = response.get_json()
        assert data['user']['name'] == 'Updated Name'

    def test_update_user_duplicate_email_returns_409(self, app, admin_user, regular_user):
        app_instance, _, TestSession = app
        token = _get_admin_token(app, admin_user)

        with patch('app.routes.auth_routes.get_session', return_value=TestSession()):
            with patch('app.middleware.auth.get_session', return_value=TestSession()):
                with app_instance.test_client() as client:
                    response = client.put(f'/api/auth/users/{regular_user}',
                                          headers=_make_auth_header(token),
                                          json={"email": "admin@test.com"})

        assert response.status_code == 409
        data = response.get_json()
        assert data['error'] == 'Email sudah digunakan'
