pipeline {
    agent {
        label 'nodejs-agent'
    }

    tools {
        nodejs 'Node.js 22.6.0'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm pack'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }
}
