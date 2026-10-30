import pytest
from app import create_app
from models.db import db as _db
from seed import seed_database


@pytest.fixture(scope="session")
def app():
    """Create a test Flask app with in-memory SQLite, seeded once per session."""
    test_app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret-key",
        "WTF_CSRF_ENABLED": False,
    })
    # Seed within app context - create_app already creates tables, but we
    # re-seed here explicitly to ensure data is present
    with test_app.app_context():
        _db.drop_all()
        _db.create_all()
        seed_database(test_app, _db)
    yield test_app


@pytest.fixture(scope="session")
def client(app):
    """Return a test client for the app."""
    return app.test_client()


@pytest.fixture(scope="session")
def seeded_app(app):
    """Alias for app — data is already seeded at session scope."""
    return app


@pytest.fixture()
def db(app):
    """Return database session for tests."""
    with app.app_context():
        yield _db
