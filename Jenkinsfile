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
                sh '''
                    npm ci
                '''
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

                    npm pack

                    mv "nodejs-cicd-demo-${VERSION}.tgz" \
                       "nodejs-cicd-demo-${ARTIFACT_VERSION}.tgz"

                    ls -lh nodejs-cicd-demo-*.tgz
                '''
            }
        }

        stage('Test') {
            steps {
                sh '''
                    npm test
                '''
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

        stage('SonarQube Quality Gate') {
            steps {
                script {
                    def ceTaskId = sh(
                        script: "grep '^ceTaskId=' .scannerwork/report-task.txt | cut -d= -f2",
                        returnStdout: true
                    ).trim()

                    echo "SonarQube CE Task ID: ${ceTaskId}"

                    withCredentials([
                        string(
                            credentialsId: 'sonarqube-token',
                            variable: 'SONAR_TOKEN'
                        )
                    ]) {

                        def analysisId = ''

                        timeout(time: 5, unit: 'MINUTES') {
                            waitUntil {
                                def response = sh(
                                    script: """
                                        curl -s \
                                          -u "\$SONAR_TOKEN:" \
                                          "http://172.31.23.180:9000/api/ce/task?id=${ceTaskId}"
                                    """,
                                    returnStdout: true
                                ).trim()

                                echo "SonarQube CE response: ${response}"

                                def status = sh(
                                    script: """
                                        echo '${response}' | \
                                        python3 -c "import sys,json; print(json.load(sys.stdin)['task']['status'])"
                                    """,
                                    returnStdout: true
                                ).trim()

                                echo "SonarQube task status: ${status}"

                                if (status == 'SUCCESS') {
                                    analysisId = sh(
                                        script: """
                                            echo '${response}' | \
                                            python3 -c "import sys,json; print(json.load(sys.stdin)['task']['analysisId'])"
                                        """,
                                        returnStdout: true
                                    ).trim()

                                    return true
                                }

                                if (status in ['FAILED', 'CANCELED']) {
                                    error("SonarQube analysis failed with status: ${status}")
                                }

                                sleep 5
                                return false
                            }
                        }

                        echo "SonarQube Analysis ID: ${analysisId}"

                        def qualityGate = sh(
                            script: """
                                curl -s \
                                  -u "\$SONAR_TOKEN:" \
                                  "http://172.31.23.180:9000/api/qualitygates/project_status?analysisId=${analysisId}"
                            """,
                            returnStdout: true
                        ).trim()

                        echo "SonarQube Quality Gate response: ${qualityGate}"

                        def gateStatus = sh(
                            script: """
                                echo '${qualityGate}' | \
                                python3 -c "import sys,json; print(json.load(sys.stdin)['projectStatus']['status'])"
                            """,
                            returnStdout: true
                        ).trim()

                        echo "SonarQube Quality Gate status: ${gateStatus}"

                        if (gateStatus != 'OK') {
                            error("SonarQube Quality Gate failed: ${gateStatus}")
                        }
                    }
                }
            }
        }

        stage('Push Artifact to Nexus') {
            when {
                not {
                    branch 'main'
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
                            curl --noproxy '*' \
                              --fail \
                              --show-error \
                              --connect-timeout 10 \
                              --max-time 120 \
                              -u "\$NEXUS_USER:\$NEXUS_PASSWORD" \
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
                            curl --noproxy '*' \
                              --fail \
                              --show-error \
                              --connect-timeout 10 \
                              --max-time 120 \
                              -u "\$NEXUS_USER:\$NEXUS_PASSWORD" \
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
                        cp "${artifact}" "\$HOME/nodejs-app/"
                        "\$HOME/deploy-app.sh" "\$HOME/nodejs-app/${artifact}"
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
