import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'customers.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'churn_model.pkl')

# Flask config
DEBUG = True
HOST = '0.0.0.0'
PORT = 5000
