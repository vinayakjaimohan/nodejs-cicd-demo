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
                sh '''
                    VERSION=$(node -p "require('./package.json').version")
                    ARTIFACT_VERSION="${VERSION}-feature.${BUILD_NUMBER}"
                    npm version "$ARTIFACT_VERSION" --no-git-tag-version
                    npm pack
                '''
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=nodejs-cicd-demo \
                          -Dsonar.sources=app.js \
                          -Dsonar.tests=test \
                          -Dsonar.test.inclusions=test/**/*.js
                    '''
                }
            }
        }
    }
}
