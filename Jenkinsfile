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
                script {
                    withCredentials([string(
                        credentialsId: 'sonarqube-token',
                        variable: 'SONAR_TOKEN'
                    )]) {

                        timeout(time: 5, unit: 'MINUTES') {
                            waitUntil {
                                def result = sh(
                                    script: '''
                                        curl -s -u "$SONAR_TOKEN:" \
                                        "http://172.31.23.180:9000/api/ce/component?component=nodejs-cicd-demo"
                                    ''',
                                    returnStdout: true
                                ).trim()

                                echo "SonarQube task status: ${result}"

                                return result.contains('"status":"SUCCESS"') ||
                                       result.contains('"status":"FAILED"')
                            }
                        }

                        def gate = sh(
                            script: '''
                                curl -s -u "$SONAR_TOKEN:" \
                                "http://172.31.23.180:9000/api/qualitygates/project_status?projectKey=nodejs-cicd-demo"
                            ''',
                            returnStdout: true
                        ).trim()

                        echo "SonarQube Quality Gate: ${gate}"

                        if (!gate.contains('"status":"OK"')) {
                            error "SonarQube Quality Gate failed"
                        }
                    }
                }
            }
        }

      stage('Push Artifact to Nexus') {
       steps {
        script {
            def artifact = sh(
                script: 'ls *.tgz | head -n 1',
                returnStdout: true
            ).trim()

            nexusArtifactUploader(
                nexusVersion: 'nexus3',
                protocol: 'http',
                nexusUrl: '172.31.16.167:8081',
                groupId: 'com.example',
                version: "${BUILD_NUMBER}",
                repository: 'npm-releases',
                credentialsId: 'nexus-jenkins',
                artifacts: [
                    [
                        artifactId: 'nodejs-cicd-demo',
                        classifier: '',
                        file: artifact,
                        type: 'tgz'
                    ]
                ]
            )
          }
       }
      }
    }
}
