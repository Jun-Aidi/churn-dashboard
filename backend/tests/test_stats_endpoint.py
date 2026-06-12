"""
Tests for the admin system stats endpoint (GET /api/auth/stats).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import patch, MagicMock
from flask import Flask

from app.routes.auth_routes import auth_bp
from app.models.user import User


@pytest.fixture
def app():
    """Create a Flask test app with the auth blueprint."""
    test_app = Flask(__name__)
    test_app.config['TESTING'] = True
    test_app.register_blueprint(auth_bp, url_prefix='/api/auth')
    return test_app


@pytest.fixture
def client(app):
    """Create a test client."""
    with app.test_client() as c:
        yield c


def _make_admin_user():
    """Create a mock admin user."""
    user = MagicMock(spec=User)
    user.id = 1
    user.name = 'Admin'
    user.email = 'admin@test.com'
    user.role = 'admin'
    user.is_active = True
    return user


def _make_regular_user():
    """Create a mock regular user."""
    user = MagicMock(spec=User)
    user.id = 2
    user.name = 'User'
    user.email = 'user@test.com'
    user.role = 'user'
    user.is_active = True
    return user


class TestStatsEndpoint:
    """Tests for GET /api/auth/stats."""

    @patch('app.middleware.auth.get_session')
    @patch('app.middleware.auth.decode_token')
    @patch('app.routes.auth_routes.get_session')
    def test_stats_returns_correct_counts(self, mock_route_session, mock_decode, mock_auth_session, client):
        """Stats endpoint returns correct counts for all categories."""
        admin = _make_admin_user()

        # Mock auth middleware
        mock_decode.return_value = {'user_id': 1, 'email': 'admin@test.com', 'role': 'admin'}
        auth_session = MagicMock()
        auth_session.query.return_value.filter_by.return_value.first.return_value = admin
        mock_auth_session.return_value = auth_session

        # Mock stats session
        stats_session = MagicMock()

        # Setup query mocks for each count
        def query_side_effect(model_or_func):
            mock_query = MagicMock()
            return mock_query

        stats_session.query.side_effect = query_side_effect

        # More specific mocking using call tracking
        call_count = [0]
        def query_mock(arg):
            call_count[0] += 1
            m = MagicMock()
            if call_count[0] == 1:  # active_users
                m.filter_by.return_value.count.return_value = 5
            elif call_count[0] == 2:  # inactive_users
                m.filter_by.return_value.count.return_value = 1
            elif call_count[0] == 3:  # total_customers
                m.count.return_value = 1200
            elif call_count[0] == 4:  # total_scored_customers (filter risk_score not null)
                m.filter.return_value.count.return_value = 900
            elif call_count[0] == 5:  # total_chat_sessions (distinct count)
                m.scalar.return_value = 42
            return m

        stats_session.query.side_effect = query_mock
        mock_route_session.return_value = stats_session

        response = client.get('/api/auth/stats', headers={
            'Authorization': 'Bearer valid-token'
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['active_users'] == 5
        assert data['inactive_users'] == 1
        assert data['total_customers'] == 1200
        assert data['total_scored_customers'] == 900
        assert data['total_chat_sessions'] == 42

    @patch('app.middleware.auth.get_session')
    @patch('app.middleware.auth.decode_token')
    @patch('app.routes.auth_routes.get_session')
    def test_stats_returns_503_when_db_unavailable(self, mock_route_session, mock_decode, mock_auth_session, client):
        """Stats endpoint returns 503 when database session is None."""
        admin = _make_admin_user()

        # Mock auth middleware
        mock_decode.return_value = {'user_id': 1, 'email': 'admin@test.com', 'role': 'admin'}
        auth_session = MagicMock()
        auth_session.query.return_value.filter_by.return_value.first.return_value = admin
        mock_auth_session.return_value = auth_session

        # Simulate database unavailable for stats query
        mock_route_session.return_value = None

        response = client.get('/api/auth/stats', headers={
            'Authorization': 'Bearer valid-token'
        })

        assert response.status_code == 503
        data = response.get_json()
        assert data['error'] == 'Data sistem tidak tersedia'

    @patch('app.middleware.auth.get_session')
    @patch('app.middleware.auth.decode_token')
    @patch('app.routes.auth_routes.get_session')
    def test_stats_returns_503_on_db_exception(self, mock_route_session, mock_decode, mock_auth_session, client):
        """Stats endpoint returns 503 when database query raises exception."""
        admin = _make_admin_user()

        # Mock auth middleware
        mock_decode.return_value = {'user_id': 1, 'email': 'admin@test.com', 'role': 'admin'}
        auth_session = MagicMock()
        auth_session.query.return_value.filter_by.return_value.first.return_value = admin
        mock_auth_session.return_value = auth_session

        # Simulate database error during stats query
        stats_session = MagicMock()
        stats_session.query.side_effect = Exception("Database connection lost")
        mock_route_session.return_value = stats_session

        response = client.get('/api/auth/stats', headers={
            'Authorization': 'Bearer valid-token'
        })

        assert response.status_code == 503
        data = response.get_json()
        assert data['error'] == 'Data sistem tidak tersedia'

    @patch('app.middleware.auth.get_session')
    @patch('app.middleware.auth.decode_token')
    def test_stats_requires_admin_role(self, mock_decode, mock_auth_session, client):
        """Stats endpoint returns 403 for non-admin users."""
        user = _make_regular_user()

        # Mock auth middleware - regular user
        mock_decode.return_value = {'user_id': 2, 'email': 'user@test.com', 'role': 'user'}
        auth_session = MagicMock()
        auth_session.query.return_value.filter_by.return_value.first.return_value = user
        mock_auth_session.return_value = auth_session

        response = client.get('/api/auth/stats', headers={
            'Authorization': 'Bearer valid-token'
        })

        assert response.status_code == 403
        data = response.get_json()
        assert data['error'] == 'Akses ditolak'

    def test_stats_requires_auth(self, client):
        """Stats endpoint returns 401 without auth header."""
        response = client.get('/api/auth/stats')

        assert response.status_code == 401
        data = response.get_json()
        assert data['error'] == 'Token tidak valid atau sudah expired'
