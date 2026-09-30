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
                    rm -f nodejs-cicd-demo-*.tgz

                    VERSION=$(node -p "require('./package.json').version")

                    if [ "$BRANCH_NAME" = "main" ]; then
                        ARTIFACT_VERSION="${VERSION}-release.${BUILD_NUMBER}"
                    else
                        ARTIFACT_VERSION="${VERSION}-feature.${BUILD_NUMBER}"
                    fi

                    echo "Artifact version: $ARTIFACT_VERSION"

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
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                              -Dsonar.projectKey=nodejs-cicd-demo \
                              -Dsonar.sources=app.js \
                              -Dsonar.tests=test \
                              -Dsonar.test.inclusions=test/**/*.js
                        """
                    }
                }
            }
        }

         

stage('SonarQube Quality Gate') {
    steps {
        timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
        }
    }
}
        stage('Push Feature Artifact to Nexus') {
            when {
                expression {
                    env.BRANCH_NAME.startsWith('feature/')
                }
            }

            steps {
                script {
                    def artifact = sh(
                        script: 'ls -t nodejs-cicd-demo-*.tgz | head -n 1',
                        returnStdout: true
                    ).trim()

                    echo "Uploading feature artifact: ${artifact}"

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'nexus-jenkins',
                            usernameVariable: 'NEXUS_USER',
                            passwordVariable: 'NEXUS_PASSWORD'
                        )
                    ]) {
                        sh """
                            curl --fail \
                              --http1.1 \
                              --connect-timeout 10 \
                              --max-time 180 \
                              --retry 5 \
                              --retry-delay 5 \
                              --retry-all-errors \
                              -u "\\$NEXUS_USER:\\$NEXUS_PASSWORD" \
                              --upload-file "${artifact}" \
                              "http://172.31.16.167:8081/repository/raw-release/${artifact}"
                        """
                    }
                }
            }
        }

        stage('Push Release Artifact to Nexus') {
            when {
                branch 'main'
            }

            steps {
                script {
                    def artifact = sh(
                        script: 'ls -t nodejs-cicd-demo-*.tgz | head -n 1',
                        returnStdout: true
                    ).trim()

                    echo "Uploading release artifact: ${artifact}"

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'nexus-jenkins',
                            usernameVariable: 'NEXUS_USER',
                            passwordVariable: 'NEXUS_PASSWORD'
                        )
                    ]) {
                        sh """
                            curl --fail \
                              --http1.1 \
                              --connect-timeout 10 \
                              --max-time 180 \
                              --retry 5 \
                              --retry-delay 5 \
                              --retry-all-errors \
                              -u "\\$NEXUS_USER:\\$NEXUS_PASSWORD" \
                              --upload-file "${artifact}" \
                              "http://172.31.16.167:8081/repository/raw-release/${artifact}"
                        """
                    }
                }
            }
        }

        stage('Deploy to EC2') {
            when {
                branch 'main'
            }

            steps {
                script {
                    def artifact = sh(
                        script: 'ls -t nodejs-cicd-demo-*.tgz | head -n 1',
                        returnStdout: true
                    ).trim()

                    echo "Deploying artifact: ${artifact}"

                    sh """
                        cp "${artifact}" "\\$HOME/nodejs-app/"
                        "\\$HOME/deploy-app.sh" "\\$HOME/nodejs-app/${artifact}"
                    """
                }
            }
        }

        stage('Smoke Test') {
            when {
                branch 'main'
            }

            steps {
                sh '''
                    sleep 3
                    curl -f http://localhost:3000/health
                '''
            }
        }
    }
}
